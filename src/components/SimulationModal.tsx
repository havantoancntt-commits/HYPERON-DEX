import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ConfirmationPanel } from './common/ConfirmationPanel';
import { SecurityStatus, SimulationStatus } from '../lib/designSystem';
import { parseUnits } from 'viem';

export const SimulationModal: React.FC = () => {
  const { activeSimulation, setActiveSimulation, activeQuote, setActiveQuote, addToast } = useExchange();
  const {
    executeTransaction,
    chainId,
    address,
    isConnected,
    isWatchOnly,
    checkAllowance,
    approveTokenOnChain,
    refreshBalances,
  } = useWallet();

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string>('IDLE');
  const [executionTxHash, setExecutionTxHash] = useState<string | undefined>(undefined);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!activeSimulation || !activeQuote) return null;

  const handleConfirmAndSign = async () => {
    if (!activeQuote) {
      addToast({
        title: 'Báo Giá Không Hợp Lệ',
        message: 'Không tìm thấy thông tin báo giá đã xác thực.',
        type: 'error',
      });
      return;
    }

    if (!isConnected || !address) {
      addToast({
        title: 'Chưa Kết Nối Ví',
        message: 'Vui lòng kết nối ví Web3 để ký giao dịch trên chuỗi.',
        type: 'warning',
      });
      return;
    }

    if (isWatchOnly) {
      addToast({
        title: 'Chế Độ Chỉ Xem (Watch-Only)',
        message: 'Ví này đang ở chế độ theo dõi và không thể ký giao dịch on-chain.',
        type: 'warning',
      });
      return;
    }

    // Strict: Check quote expiry
    if (activeQuote.expiresAt && Date.now() > activeQuote.expiresAt) {
      addToast({
        title: 'Báo Giá Đã Hết Hạn',
        message: 'Báo giá này đã quá thời gian hiệu lực. Vui lòng lấy báo giá mới trước khi xác nhận.',
        type: 'warning',
      });
      return;
    }

    // Strict: Block confirmation if simulation failed or reverted
    if (!activeSimulation.success || activeSimulation.status === 'FAILED') {
      addToast({
        title: 'Giao Dịch Bị Chặn Do Mô Phỏng Thất Bại',
        message: 'Mô phỏng tiền kiểm tra trên blockchain đã bị revert. Không thể ký giao dịch để tránh mất gas.',
        type: 'error',
      });
      return;
    }

    setIsExecuting(true);
    setErrorText(null);

    try {
      const fromToken = activeQuote.fromToken;
      const routerAddress = (activeSimulation.routerAddress || activeSimulation.toAddress) as `0x${string}`;

      // Check ERC-20 allowance if not native token
      if (!fromToken.isNative && fromToken.address && fromToken.address.startsWith('0x') && routerAddress) {
        setExecutionStep('CHECKING_ALLOWANCE');
        const tokenDecimals = fromToken.decimals || 18;
        const requiredAmountWei = parseUnits(activeQuote.fromAmount.toString(), tokenDecimals);

        try {
          const currentAllowance = await checkAllowance(fromToken.address as `0x${string}`, address as `0x${string}`, routerAddress);
          if (currentAllowance < requiredAmountWei) {
            setExecutionStep('APPROVING');
            addToast({
              title: 'Cần Phê Duyệt Token (Approve)',
              message: `Vui lòng xác nhận phê duyệt chi tiêu ${fromToken.symbol} trong cửa sổ ví của bạn.`,
              type: 'info',
            });

            const approveTx = await approveTokenOnChain(fromToken.address as `0x${string}`, routerAddress);
            setExecutionStep('APPROVAL_PENDING');
            addToast({
              title: 'Đã Gửi Lệnh Phê Duyệt',
              message: `Mã duyệt token: ${approveTx.substring(0, 10)}... Đang tiếp tục hoán đổi.`,
              type: 'info',
            });
            // Small pause for state propagation
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch (allowanceErr: any) {
          console.warn('[SimulationModal] Allowance check or approval handled with fallback:', allowanceErr);
        }
      }

      // Step: Signing Swap Transaction
      setExecutionStep('SIGNING');

      // Extract gas from simulation data
      const gasPriceWei = activeSimulation.gasPriceWei ? BigInt(activeSimulation.gasPriceWei) : 0n;
      const gasSpentGwei = gasPriceWei > 0n ? Number(gasPriceWei) / 1e9 : 15;
      const gasSpentUsd = activeSimulation.gasCostUsd > 0 ? activeSimulation.gasCostUsd : 0.50;

      const tx = await executeTransaction({
        chainId: chainId,
        type: 'SWAP',
        fromToken: fromToken.symbol,
        toToken: activeQuote.toToken.symbol,
        fromAmount: activeQuote.fromAmount,
        toAmount: activeQuote.expectedOutput,
        gasSpentGwei: Math.max(0.1, Number(gasSpentGwei.toFixed(2))),
        gasSpentUsd,
        targetAddress: routerAddress,
        calldata: activeSimulation.calldata,
        valueHex: activeSimulation.valueHex,
        toTokenAddress: activeQuote.toToken?.address,
        minimumReceivedRaw: activeQuote.minimumReceivedRaw,
      });

      setExecutionTxHash(tx.txHash);

      if (tx.status === 'confirmed') {
        setExecutionStep('SUCCESS');
        setIsCompleted(true);
        addToast({
          title: 'Hoán Đổi Thành Công Trên Chuỗi',
          message: `Khối #${tx.blockNumber || 'mới nhất'} đã xác nhận. Mã TX: ${tx.txHash.substring(0, 10)}...`,
          type: 'success',
        });
        refreshBalances();
      } else {
        // Pending state: NEVER show success until on-chain receipt verification confirms it!
        setExecutionStep('CONFIRMING');
        setIsCompleted(false);
        addToast({
          title: 'Giao Dịch Đã Phát Lên Mạng',
          message: `Đang chờ khối xác nhận on-chain... Mã TX: ${tx.txHash.substring(0, 10)}...`,
          type: 'info',
        });

        // Listen for live on-chain confirmation event from ReceiptVerifier
        const confirmationHandler = (event: any) => {
          const detail = event?.detail;
          if (detail && detail.txHash === tx.txHash) {
            window.removeEventListener('hyperon:transaction_confirmed', confirmationHandler);
            if (detail.status === 'confirmed') {
              setExecutionStep('SUCCESS');
              setIsCompleted(true);
              addToast({
                title: 'Hoán Đổi Thành Công Trên Chuỗi',
                message: `Khối #${detail.blockNumber || 'mới nhất'} đã xác nhận hợp lệ.`,
                type: 'success',
              });
              refreshBalances();
            } else {
              setExecutionStep('ERROR');
              setErrorText('Giao dịch đã bị hoàn tác (revert) trên blockchain.');
              addToast({
                title: 'Giao Dịch Thất Bại Trên Chuỗi',
                message: 'Giao dịch bị hoàn tác hoặc không thỏa điều kiện bảo vệ trượt giá.',
                type: 'error',
              });
            }
          }
        };

        window.addEventListener('hyperon:transaction_confirmed', confirmationHandler);
      }
    } catch (err: any) {
      console.error('[SimulationModal] Execution error:', err);
      const msg = err?.message || 'Người dùng đã hủy hoặc RPC từ chối ký giao dịch.';
      setErrorText(msg);
      setExecutionStep('IDLE');
      addToast({
        title: 'Giao Dịch Thất Bại Hoặc Bị Hủy',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setActiveSimulation(null);
    setActiveQuote(null);
    setIsCompleted(false);
    setExecutionStep('IDLE');
    setExecutionTxHash(undefined);
    setErrorText(null);
  };

  const simStatus: SimulationStatus = !activeSimulation
    ? 'SIMULATING'
    : activeSimulation.success && activeSimulation.status !== 'FAILED'
    ? 'PASSED'
    : 'FAILED';

  const secStatus: SecurityStatus =
    !activeQuote.fromToken || !activeQuote.toToken
      ? 'UNKNOWN'
      : activeQuote.fromToken.isVerified && activeQuote.toToken.isVerified
      ? 'SAFE'
      : 'WARNING';

  const modalNode = (
    <ConfirmationPanel
      isOpen={Boolean(activeSimulation && activeQuote)}
      onClose={handleClose}
      onConfirm={handleConfirmAndSign}
      quote={activeQuote}
      simulationStatus={simStatus}
      securityStatus={secStatus}
      isBroadcasting={isExecuting}
      executionStep={executionStep}
      executionTxHash={executionTxHash}
      isCompleted={isCompleted}
      errorText={errorText}
    />
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
