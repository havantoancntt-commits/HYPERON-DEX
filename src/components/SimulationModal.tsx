import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ConfirmationPanel } from './common/ConfirmationPanel';
import { SecurityStatus, SimulationStatus } from '../lib/designSystem';

export const SimulationModal: React.FC = () => {
  const { activeSimulation, setActiveSimulation, activeQuote, setActiveQuote, addToast } = useExchange();
  const { executeTransaction, chainId } = useWallet();
  const [isExecuting, setIsExecuting] = useState(false);

  if (!activeSimulation || !activeQuote) return null;

  const handleConfirmAndSign = async () => {
    if (!activeQuote) {
      addToast({
        title: 'Báo Giá Không Hợp Lệ',
        message: 'Không tìm thấy báo giá đã được xác thực cho giao dịch này.',
        type: 'error',
      });
      return;
    }

    // Strict: Check quote expiry
    if (activeQuote.expiresAt && Date.now() > activeQuote.expiresAt) {
      addToast({
        title: 'Báo Giá Đã Hết Hạn',
        message: 'Báo giá này đã quá thời gian hiệu lực. Vui lòng lấy báo giá mới trước khi xác nhận giao dịch.',
        type: 'warning',
      });
      return;
    }

    // Strict: Block confirmation if simulation failed or reverted
    if (!activeSimulation.success || activeSimulation.status === 'FAILED') {
      addToast({
        title: 'Giao Dịch Bị Chặn Do Mô Phỏng Thất Bại',
        message: 'Mô phỏng tiền kiểm tra trên blockchain đã bị revert. Không thể ký giao dịch để tránh mất phí gas vô ích.',
        type: 'error',
      });
      return;
    }

    setIsExecuting(true);
    try {
      const fromToken = activeQuote.fromToken.symbol;
      const toToken = activeQuote.toToken.symbol;
      const fromAmount = activeQuote.fromAmount;
      const toAmount = activeQuote.expectedOutput;

      // Extract gas from simulation data
      const gasPriceWei = activeSimulation.gasPriceWei ? BigInt(activeSimulation.gasPriceWei) : 0n;
      const gasSpentGwei = gasPriceWei > 0n ? Number(gasPriceWei) / 1e9 : 15;
      const gasSpentUsd = activeSimulation.gasCostUsd > 0 ? activeSimulation.gasCostUsd : 0.50;

      const tx = await executeTransaction({
        chainId: (chainId as any) || 'ethereum',
        type: 'SWAP',
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        gasSpentGwei: Math.max(0.1, Number(gasSpentGwei.toFixed(2))),
        gasSpentUsd,
        targetAddress: activeSimulation.routerAddress || activeSimulation.toAddress,
        calldata: activeSimulation.calldata,
        valueHex: activeSimulation.valueHex,
        toTokenAddress: activeQuote.toToken?.address,
        minimumReceivedRaw: activeQuote.minimumReceivedRaw,
      });

      addToast({
        title: tx.status === 'confirmed' ? 'Hoán Đổi Thành Công Trên Chuỗi' : 'Giao Dịch Đang Xử Lý Trên Chuỗi',
        message: tx.status === 'confirmed'
          ? `Khối #${tx.blockNumber || 'mới nhất'} đã xác nhận. Mã TX: ${tx.txHash.substring(0, 10)}...`
          : `Giao dịch đã được phát lên mempool. Mã TX: ${tx.txHash.substring(0, 10)}...`,
        type: tx.status === 'confirmed' ? 'success' : 'info',
      });
      setActiveSimulation(null);
      setActiveQuote(null);
    } catch (err: any) {
      addToast({
        title: 'Giao Dịch Thất Bại',
        message: err?.message || 'Người dùng đã hủy hoặc RPC từ chối ký giao dịch.',
        type: 'error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setActiveSimulation(null);
    setActiveQuote(null);
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
    />
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

