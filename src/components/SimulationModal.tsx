import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { ConfirmationPanel } from './common/ConfirmationPanel';

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

    setIsExecuting(true);
    try {
      const fromToken = activeQuote.fromToken.symbol;
      const toToken = activeQuote.toToken.symbol;
      const fromAmount = activeQuote.fromAmount;
      const toAmount = activeQuote.expectedOutput;

      const tx = await executeTransaction({
        chainId: (chainId as any) || 'ethereum',
        type: 'SWAP',
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        gasSpentGwei: 19,
        gasSpentUsd: activeSimulation.gasCostUsd || 1.85,
        targetAddress: activeSimulation.routerAddress || activeSimulation.toAddress,
        calldata: activeSimulation.calldata,
        valueHex: activeSimulation.valueHex,
      });

      addToast({
        title: 'Hoán Đổi Thành Công Trên Chuỗi',
        message: `Khối #${tx.blockNumber} đã xác nhận. Mã TX: ${tx.txHash.substring(0, 10)}...`,
        type: 'success',
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

  const modalNode = (
    <ConfirmationPanel
      isOpen={Boolean(activeSimulation && activeQuote)}
      onClose={handleClose}
      onConfirm={handleConfirmAndSign}
      quote={activeQuote}
      simulationStatus={activeSimulation ? 'PASSED' : 'PENDING'}
      securityStatus={activeQuote.fromToken.isVerified && activeQuote.toToken.isVerified ? 'PASSED' : 'WARNING'}
      isBroadcasting={isExecuting}
    />
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

