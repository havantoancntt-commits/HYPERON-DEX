/**
 * HYPERON-DEX Formal Swap Transaction State Machine
 * Complies strictly with Section 14, 15, 16, 17, 24, 26 of the Audit Mandate.
 *
 * Implements:
 * - 13 Linear Progressive States (IDLE -> SUCCESS)
 * - 14 Terminal / Guard Reversion States (USER_REJECTED, CHAIN_CHANGED, etc.)
 * - Strict double-swap prevention (locks submission during in-flight states)
 * - Distinct User Rejection handling ("Bạn đã từ chối giao dịch")
 * - Disconnect / Chain Change / Account Change invalidation
 */

export type SwapExecutionState =
  | 'IDLE'
  | 'VALIDATING'
  | 'CHECKING_ALLOWANCE'
  | 'APPROVING'
  | 'WAITING_APPROVAL'
  | 'FETCHING_QUOTE'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTING'
  | 'PENDING'
  | 'CONFIRMING'
  | 'VERIFYING'
  | 'SUCCESS'
  // Guard & Terminal Failure States
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'WRONG_NETWORK'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_ALLOWANCE'
  | 'SIMULATION_FAILED'
  | 'RPC_ERROR'
  | 'USER_REJECTED'
  | 'SLIPPAGE_EXCEEDED'
  | 'DEADLINE_EXPIRED'
  | 'CHAIN_CHANGED'
  | 'ACCOUNT_CHANGED'
  | 'ROUTER_NOT_DEPLOYED';

export interface SwapStateContext {
  state: SwapExecutionState;
  txHash?: string;
  approvalTxHash?: string;
  blockNumber?: number;
  gasSpentGwei?: number;
  gasSpentUsd?: number;
  actualAmountIn?: string;
  actualAmountOut?: string;
  expectedAmountOut?: string;
  minimumReceived?: string;
  fromSymbol?: string;
  toSymbol?: string;
  chainId?: string;
  networkName?: string;
  explorerUrl?: string;
  errorReason?: string;
  timestamp?: number;
}

export const IN_FLIGHT_SWAP_STATES: ReadonlySet<SwapExecutionState> = new Set([
  'VALIDATING',
  'CHECKING_ALLOWANCE',
  'APPROVING',
  'WAITING_APPROVAL',
  'FETCHING_QUOTE',
  'SIMULATING',
  'AWAITING_SIGNATURE',
  'SUBMITTING',
  'PENDING',
  'CONFIRMING',
  'VERIFYING',
]);

export function isSwapInFlight(state: SwapExecutionState): boolean {
  return IN_FLIGHT_SWAP_STATES.has(state);
}

export function canInitiateNewSwap(state: SwapExecutionState): boolean {
  return !isSwapInFlight(state);
}

/**
 * Human-readable localized status messages conforming strictly to Section 15, 24
 */
export function getSwapStateLabel(state: SwapExecutionState, fromSymbol?: string): {
  title: string;
  buttonText: string;
  detail: string;
  type: 'idle' | 'loading' | 'success' | 'warning' | 'error';
} {
  switch (state) {
    case 'IDLE':
      return {
        title: 'Sẵn Sàng',
        buttonText: 'Instant Swap',
        detail: 'Nhập số lượng token và chọn mạng để hoán đổi.',
        type: 'idle',
      };
    case 'VALIDATING':
      return {
        title: 'Kiểm Tra Giao Dịch',
        buttonText: 'Đang kiểm tra thông tin...',
        detail: 'Đang xác thực mạng, địa chỉ token và số dư ví...',
        type: 'loading',
      };
    case 'CHECKING_ALLOWANCE':
      return {
        title: 'Kiểm Tra Hạn Mức',
        buttonText: 'Đang đọc hạn mức token...',
        detail: `Đang kiểm tra hạn mức chi tiêu ${fromSymbol || 'token'} trên hợp đồng on-chain...`,
        type: 'loading',
      };
    case 'APPROVING':
      return {
        title: 'Chờ Ký Phê Duyệt',
        buttonText: 'Đang mở ví để phê duyệt...',
        detail: `Vui lòng xác nhận giao dịch approve ${fromSymbol || 'token'} trong cửa sổ ví Web3 của bạn.`,
        type: 'loading',
      };
    case 'WAITING_APPROVAL':
      return {
        title: 'Chờ Xác Nhận Phê Duyệt',
        buttonText: 'Đang chờ block phê duyệt...',
        detail: 'Giao dịch approve đã được phát sóng, đang chờ miner/validator đóng gói vào khối...',
        type: 'loading',
      };
    case 'FETCHING_QUOTE':
      return {
        title: 'Tính Toán Định Tuyến',
        buttonText: 'Đang lấy báo giá mới...',
        detail: 'Đang làm mới báo giá và kiểm tra trượt giá tối ưu...',
        type: 'loading',
      };
    case 'SIMULATING':
      return {
        title: 'Mô Phỏng Tiền Kiểm Tra',
        buttonText: 'Đang mô phỏng giao dịch...',
        detail: 'Đang thực hiện eth_call mô phỏng trên RPC để đảm bảo không bị revert...',
        type: 'loading',
      };
    case 'AWAITING_SIGNATURE':
      return {
        title: 'Chờ Ký Giao Dịch',
        buttonText: 'Waiting for wallet confirmation...',
        detail: 'Vui lòng xác nhận và ký giao dịch hoán đổi trong cửa sổ ví của bạn.',
        type: 'loading',
      };
    case 'SUBMITTING':
      return {
        title: 'Phát Sóng Giao Dịch',
        buttonText: 'Transaction submitted',
        detail: 'Giao dịch đã được ký thành công, đang gửi lên mạng lưới mempool...',
        type: 'loading',
      };
    case 'PENDING':
    case 'CONFIRMING':
      return {
        title: 'Chờ Khối Blockchain',
        buttonText: 'Waiting for blockchain confirmation...',
        detail: 'Giao dịch đang chờ xác nhận trên blockchain...',
        type: 'loading',
      };
    case 'VERIFYING':
      return {
        title: 'Xác Thực Biên Lai On-Chain',
        buttonText: 'Đang xác minh output thực tế...',
        detail: 'Đang kiểm tra receipt status, decoded logs và delta số dư token nhận được...',
        type: 'loading',
      };
    case 'SUCCESS':
      return {
        title: 'Hoán Đổi Thành Công',
        buttonText: 'Swap successful',
        detail: 'Giao dịch đã được xác nhận trên blockchain và số dư đã được cập nhật.',
        type: 'success',
      };
    case 'USER_REJECTED':
      return {
        title: 'Từ Chối Giao Dịch',
        buttonText: 'Bạn đã từ chối giao dịch.',
        detail: 'Bạn đã hủy bỏ yêu cầu ký trên ví Web3.',
        type: 'warning',
      };
    case 'WRONG_NETWORK':
      return {
        title: 'Sai Mạng Blockchain',
        buttonText: 'Vui lòng chuyển mạng',
        detail: 'Ví của bạn đang kết nối tới mạng không khớp với cặp giao dịch.',
        type: 'error',
      };
    case 'INSUFFICIENT_BALANCE':
      return {
        title: 'Không Đủ Số Dư',
        buttonText: 'Số dư không đủ',
        detail: 'Số dư trong ví không đủ để thực hiện lệnh hoán đổi và trả phí gas.',
        type: 'error',
      };
    case 'INSUFFICIENT_ALLOWANCE':
      return {
        title: 'Chưa Đủ Hạn Mức',
        buttonText: 'Cần phê duyệt token',
        detail: 'Hạn mức chi tiêu token chưa đủ để thực thi swap.',
        type: 'warning',
      };
    case 'SIMULATION_FAILED':
      return {
        title: 'Mô Phỏng Thất Bại',
        buttonText: 'Mô phỏng revert',
        detail: 'Giao dịch bị revert trong quá trình chạy thử. Lệnh bị chặn để tránh mất phí gas.',
        type: 'error',
      };
    case 'SLIPPAGE_EXCEEDED':
      return {
        title: 'Vượt Mức Trượt Giá',
        buttonText: 'Trượt giá vượt ngưỡng',
        detail: 'Biến động giá thị trường vượt quá mức trượt giá cho phép.',
        type: 'error',
      };
    case 'DEADLINE_EXPIRED':
      return {
        title: 'Thời Gian Hết Hạn',
        buttonText: 'Báo giá hết hạn',
        detail: 'Thời hạn thực thi giao dịch (deadline) đã trôi qua. Vui lòng lấy báo giá mới.',
        type: 'warning',
      };
    case 'CHAIN_CHANGED':
      return {
        title: 'Mạng Đã Đổi',
        buttonText: 'Mạng đã thay đổi',
        detail: 'Bạn đã đổi mạng trong khi giao dịch đang chuẩn bị. Vui lòng tạo báo giá mới.',
        type: 'warning',
      };
    case 'ACCOUNT_CHANGED':
      return {
        title: 'Tài Khoản Đã Đổi',
        buttonText: 'Tài khoản đã thay đổi',
        detail: 'Địa chỉ ví đã thay đổi. Báo giá và mô phỏng trước đó đã bị hủy.',
        type: 'warning',
      };
    case 'ROUTER_NOT_DEPLOYED':
      return {
        title: 'Router Chưa Triển Khai',
        buttonText: 'Swap execution chưa khả dụng trên mạng này.',
        detail: 'Hợp đồng HyperonRouter chưa được deploy trên mạng này.',
        type: 'error',
      };
    case 'RPC_ERROR':
    case 'FAILED':
    default:
      return {
        title: 'Giao Dịch Thất Bại',
        buttonText: 'Thử lại giao dịch',
        detail: 'Đã xảy ra lỗi trong quá trình thực thi trên blockchain.',
        type: 'error',
      };
  }
}
