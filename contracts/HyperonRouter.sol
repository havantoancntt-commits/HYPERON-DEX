// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title Minimal Uniswap V3 Swap Router Interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @title Minimal Uniswap V2 Router Interface
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @title ERC-7528 On-Chain Price Oracle Interface
interface IERC7528PriceOracle {
    struct PriceData {
        uint256 price; // Scaled to 18 decimals
        uint256 timestamp;
        uint256 volume24h;
        uint256 confidence; // 0 - 10000 bps
        bool isCircuitBreakerActive;
    }

    function getAssetPrice(address asset) external view returns (uint256 price, uint256 lastUpdated);
    function getAssetPriceData(address asset) external view returns (PriceData memory data);
    function isCircuitBreakerTripped(address asset) external view returns (bool);
}

/**
 * @title HyperonRouter
 * @author HYPERON-DEX Architecture Team
 * @notice Institutional Non-Custodial Multi-DEX Settlement Router.
 * @dev Supports atomic swaps across Uniswap V2 and V3 liquidity sources with
 * strict ReentrancyGuard, two-step ownership management (Ownable2Step),
 * Pausable emergency controls, ERC-7528 Oracle circuit breaker guards,
 * and fail-closed fund rescue routines.
 */
contract HyperonRouter is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    ISwapRouter public uniswapV3Router;
    IUniswapV2Router02 public uniswapV2Router;
    IERC7528PriceOracle public oracleAggregator;

    mapping(address => bool) public canonicalVerifiedTokens;
    mapping(address => bool) public authorizedRelayers;

    // --- Events ---
    event SwapExecuted(
        address indexed sender,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 protocol
    );

    event FundsRescued(address indexed token, address indexed to, uint256 amount);
    event CanonicalTokenUpdated(address indexed token, bool status);
    event RelayerUpdated(address indexed relayer, bool status);
    event OracleAggregatorUpdated(address indexed newOracle);
    event UniswapV3RouterUpdated(address indexed newRouter);
    event UniswapV2RouterUpdated(address indexed newRouter);

    // --- Custom Errors ---
    error InvalidAddress();
    error InvalidAmount();
    error ExpiredDeadline();
    error UnauthorizedRelayer();
    error InsufficientOutputAmount(uint256 received, uint256 minimumExpected);
    error InsufficientContractBalance(uint256 available, uint256 required);
    error ETHTransferFailed();
    error OracleCircuitBreakerTriggered(address asset);
    error OracleUnavailable(address asset);

    /// @notice Restricts execution to authorized relayers or protocol owner
    modifier onlyRelayer() {
        if (msg.sender != owner() && !authorizedRelayers[msg.sender]) {
            revert UnauthorizedRelayer();
        }
        _;
    }

    /**
     * @notice Initializes the HyperonRouter contract.
     * @param _uniswapV3Router Address of Uniswap V3 SwapRouter contract.
     * @param _uniswapV2Router Address of Uniswap V2 Router02 contract.
     * @param _oracleAggregator Address of ERC-7528 Oracle Aggregator.
     * @param _initialOwner Initial owner address (multi-sig or timelock recommended).
     */
    constructor(
        address _uniswapV3Router,
        address _uniswapV2Router,
        address _oracleAggregator,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_initialOwner == address(0)) revert InvalidAddress();

        if (_uniswapV3Router != address(0)) {
            uniswapV3Router = ISwapRouter(_uniswapV3Router);
        }
        if (_uniswapV2Router != address(0)) {
            uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
        }
        if (_oracleAggregator != address(0)) {
            oracleAggregator = IERC7528PriceOracle(_oracleAggregator);
        }

        // Seed default canonical verified tokens (WETH, USDC, USDT, WBTC, DAI on Ethereum)
        canonicalVerifiedTokens[0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2] = true; // WETH
        canonicalVerifiedTokens[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = true; // USDC
        canonicalVerifiedTokens[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true; // USDT
        canonicalVerifiedTokens[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = true; // WBTC
        canonicalVerifiedTokens[0x6B175474E89094C44Da98b954EedeAC495271d0F] = true; // DAI
    }

    // --- Configuration Functions ---

    function setCanonicalVerifiedToken(address token, bool status) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        canonicalVerifiedTokens[token] = status;
        emit CanonicalTokenUpdated(token, status);
    }

    function setRelayer(address relayer, bool status) external onlyOwner {
        if (relayer == address(0)) revert InvalidAddress();
        authorizedRelayers[relayer] = status;
        emit RelayerUpdated(relayer, status);
    }

    function setOracleAggregator(address _oracle) external onlyOwner {
        oracleAggregator = IERC7528PriceOracle(_oracle);
        emit OracleAggregatorUpdated(_oracle);
    }

    function setUniswapV3Router(address _router) external onlyOwner {
        uniswapV3Router = ISwapRouter(_router);
        emit UniswapV3RouterUpdated(_router);
    }

    function setUniswapV2Router(address _router) external onlyOwner {
        uniswapV2Router = IUniswapV2Router02(_router);
        emit UniswapV2RouterUpdated(_router);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Swap Execution Functions ---

    /**
     * @notice Executes a single-hop swap via Uniswap V3.
     */
    function swapExactInputSingleV3(
        address tokenIn,
        address tokenOut,
        uint24 feeTier,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (recipient == address(0)) revert InvalidAddress();
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidAddress();
        if (amountIn == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (address(uniswapV3Router) == address(0)) revert InvalidAddress();

        _checkOracleSafety(tokenIn);
        _checkOracleSafety(tokenOut);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(uniswapV3Router), amountIn);

        amountOut = uniswapV3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeTier,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        if (amountOut < amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, amountOutMinimum);
        }

        emit SwapExecuted(
            msg.sender,
            recipient,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            bytes32("UNISWAP_V3")
        );
    }

    /**
     * @notice Executes a relayed swap via Uniswap V3 on behalf of a user.
     * @dev Controlled strictly by authorized relayers or owner via `onlyRelayer`.
     */
    function executeRelayedSwapV3(
        address tokenIn,
        address tokenOut,
        uint24 feeTier,
        address user,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external onlyRelayer nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (user == address(0) || recipient == address(0)) revert InvalidAddress();
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidAddress();
        if (amountIn == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (address(uniswapV3Router) == address(0)) revert InvalidAddress();

        _checkOracleSafety(tokenIn);
        _checkOracleSafety(tokenOut);

        IERC20(tokenIn).safeTransferFrom(user, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(uniswapV3Router), amountIn);

        amountOut = uniswapV3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeTier,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        if (amountOut < amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, amountOutMinimum);
        }

        emit SwapExecuted(
            user,
            recipient,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            bytes32("RELAYED_UNISWAP_V3")
        );
    }

    /**
     * @notice Executes an exact-tokens-for-tokens swap via Uniswap V2 interface.
     */
    function swapExactTokensForTokensV2(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address recipient,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint256[] memory amounts) {
        if (recipient == address(0)) revert InvalidAddress();
        if (path.length < 2) revert InvalidAddress();
        if (amountIn == 0) revert InvalidAmount();
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (address(uniswapV2Router) == address(0)) revert InvalidAddress();

        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];

        _checkOracleSafety(tokenIn);
        _checkOracleSafety(tokenOut);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(uniswapV2Router), amountIn);

        amounts = uniswapV2Router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            deadline
        );

        uint256 finalOut = amounts[amounts.length - 1];
        if (finalOut < amountOutMin) {
            revert InsufficientOutputAmount(finalOut, amountOutMin);
        }

        emit SwapExecuted(
            msg.sender,
            recipient,
            tokenIn,
            tokenOut,
            amountIn,
            finalOut,
            bytes32("UNISWAP_V2")
        );
    }

    // --- Oracle Safety Verification ---

    function _checkOracleSafety(address token) internal view {
        if (address(oracleAggregator) == address(0)) {
            return;
        }

        try oracleAggregator.isCircuitBreakerTripped(token) returns (bool tripped) {
            if (tripped) revert OracleCircuitBreakerTriggered(token);
        } catch {
            if (canonicalVerifiedTokens[token]) {
                return;
            }
            revert OracleUnavailable(token);
        }

        try oracleAggregator.getAssetPriceData(token) returns (IERC7528PriceOracle.PriceData memory data) {
            if (data.isCircuitBreakerActive) {
                revert OracleCircuitBreakerTriggered(token);
            }
        } catch {
            if (canonicalVerifiedTokens[token]) {
                return;
            }
            revert OracleUnavailable(token);
        }
    }

    // --- Asset Rescue Function ---

    /**
     * @notice Rescues accidentally trapped ERC-20 tokens or native ETH.
     * @dev Restricted strictly to contract owner with non-reentrant guard.
     */
    function rescueFunds(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        if (token == address(0)) {
            uint256 bal = address(this).balance;
            if (bal < amount) revert InsufficientContractBalance(bal, amount);
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert ETHTransferFailed();
        } else {
            uint256 bal = IERC20(token).balanceOf(address(this));
            if (bal < amount) revert InsufficientContractBalance(bal, amount);
            IERC20(token).safeTransfer(to, amount);
        }

        emit FundsRescued(token, to, amount);
    }

    /// @notice Allows contract to receive ETH
    receive() external payable {}
}
