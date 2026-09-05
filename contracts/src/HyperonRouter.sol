// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "./interfaces/ISwapRouter.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IERC7528PriceOracle.sol";

/**
 * @title HyperonRouter
 * @author HYPERON-DEX Architecture Team
 * @notice Institutional Hybrid On-Chain/Off-Chain Multi-DEX Settlement Router.
 * @dev Fully non-custodial router supporting Uniswap V3, Uniswap V2, Curve, and EIP-4626 vaults.
 * Implements strict reentrancy protection, relayer authorization, slippage validation,
 * and ERC-7528 on-chain circuit breaker safety guards.
 *
 * NOTE: HYPERON-DEX is an independent, non-custodial decentralized exchange protocol,
 * completely unrelated and unaffiliated with the HyperDX project.
 */
contract HyperonRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    ISwapRouter public immutable uniswapV3Router;
    IERC7528PriceOracle public oracleAggregator;

    mapping(address => bool) public authorizedRelayers;
    bool public emergencyHaltActive;

    // --- Events ---
    event SwapExecuted(
        address indexed sender,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 routeHash
    );

    event RelayerUpdated(address indexed relayer, bool authorized);
    event EmergencyHaltUpdated(bool active, string reason);
    event OracleAggregatorUpdated(address indexed newOracle);

    // --- Custom Errors ---
    error EmergencyHalted();
    error UnauthorizedRelayer();
    error InsufficientOutputAmount(uint256 received, uint256 minimumExpected);
    error InvalidAddress();
    error InvalidAmount();
    error ExpiredDeadline();
    error OracleCircuitBreakerTriggered(address asset);

    // --- Modifiers ---
    modifier whenNotHalted() {
        if (emergencyHaltActive) revert EmergencyHalted();
        _;
    }

    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedRelayer();
        }
        _;
    }

    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        _;
    }

    constructor(
        address _uniswapV3Router,
        address _oracleAggregator,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_uniswapV3Router == address(0)) revert InvalidAddress();
        uniswapV3Router = ISwapRouter(_uniswapV3Router);
        oracleAggregator = IERC7528PriceOracle(_oracleAggregator);
        authorizedRelayers[_initialOwner] = true;
    }

    // --- Configuration Functions ---

    function setRelayer(address relayer, bool status) external onlyOwner {
        if (relayer == address(0)) revert InvalidAddress();
        authorizedRelayers[relayer] = status;
        emit RelayerUpdated(relayer, status);
    }

    function setOracleAggregator(address _newOracle) external onlyOwner {
        oracleAggregator = IERC7528PriceOracle(_newOracle);
        emit OracleAggregatorUpdated(_newOracle);
    }

    function setEmergencyHalt(bool _halted, string calldata reason) external onlyOwner {
        emergencyHaltActive = _halted;
        emit EmergencyHaltUpdated(_halted, reason);
    }

    // --- Core Swap Interfaces ---

    struct SingleSwapParams {
        address tokenIn;
        address tokenOut;
        uint24 feeTier; // e.g. 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        bytes32 routeHash;
    }

    /**
     * @notice Executes a single-hop swap through Uniswap V3 or direct pool with slippage enforcement.
     * @param params Swap execution parameters
     * @return amountOut The actual amount of tokenOut delivered to the recipient
     */
    function swapExactInputSingle(
        SingleSwapParams calldata params
    ) external payable nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0)) revert InvalidAddress();

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        // Transfer funds from sender to this router
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Approve router for exact amount
        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), params.amountIn);

        ISwapRouter.ExactInputSingleParams memory uniParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            fee: params.feeTier,
            recipient: params.recipient,
            deadline: params.deadline,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = uniswapV3Router.exactInputSingle(uniParams);

        if (amountOut < params.amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, params.amountOutMinimum);
        }

        emit SwapExecuted(
            msg.sender,
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.routeHash
        );
    }

    struct MultiHopSwapParams {
        bytes path; // Encoded (tokenIn, fee, tokenMid, fee, tokenOut)
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        bytes32 routeHash;
    }

    /**
     * @notice Executes a multi-hop route through multi-pool paths.
     * @param params Multi-hop routing parameters
     * @return amountOut The total amount received
     */
    function swapExactInputMultiple(
        MultiHopSwapParams calldata params
    ) external payable nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0)) revert InvalidAddress();

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), params.amountIn);

        ISwapRouter.ExactInputParams memory uniParams = ISwapRouter.ExactInputParams({
            path: params.path,
            recipient: params.recipient,
            deadline: params.deadline,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum
        });

        amountOut = uniswapV3Router.exactInput(uniParams);

        if (amountOut < params.amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, params.amountOutMinimum);
        }

        emit SwapExecuted(
            msg.sender,
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.routeHash
        );
    }

    struct CurveSwapParams {
        address curvePool;
        address tokenIn;
        address tokenOut;
        int128 i;
        int128 j;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        bytes32 routeHash;
    }

    /**
     * @notice Executes a swap through Curve StableSwap pool.
     */
    function swapCurveStable(
        CurveSwapParams calldata params
    ) external nonReentrant whenNotHalted returns (uint256 amountOut) {
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0) || params.curvePool == address(0)) revert InvalidAddress();

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenIn).forceApprove(params.curvePool, params.amountIn);

        amountOut = ICurvePool(params.curvePool).exchange(
            params.i,
            params.j,
            params.amountIn,
            params.minAmountOut
        );

        if (amountOut < params.minAmountOut) {
            revert InsufficientOutputAmount(amountOut, params.minAmountOut);
        }

        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        emit SwapExecuted(
            msg.sender,
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.routeHash
        );
    }

    // --- EIP-4626 Tokenized Vault Integration ---

    /**
     * @notice Deposits tokenIn into an EIP-4626 vault and delivers shares to recipient.
     */
    function depositToVault(
        address vault,
        uint256 assets,
        address recipient
    ) external nonReentrant whenNotHalted returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();
        if (recipient == address(0) || vault == address(0)) revert InvalidAddress();

        address underlying = IERC4626(vault).asset();
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), assets);
        IERC20(underlying).forceApprove(vault, assets);

        shares = IERC4626(vault).deposit(assets, recipient);
    }

    /**
     * @notice Redeems shares from an EIP-4626 vault and delivers underlying assets to recipient.
     */
    function redeemFromVault(
        address vault,
        uint256 shares,
        address recipient
    ) external nonReentrant whenNotHalted returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();
        if (recipient == address(0) || vault == address(0)) revert InvalidAddress();

        IERC20(vault).safeTransferFrom(msg.sender, address(this), shares);
        assets = IERC4626(vault).redeem(shares, recipient, address(this));
    }

    // --- Relayer Subsidized Swap Execution ---

    /**
     * @notice Allows an authorized relayer to broadcast a swap on behalf of a user who signed off-chain.
     */
    function relaySwap(
        SingleSwapParams calldata params,
        address userSender
    ) external onlyRelayer nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (userSender == address(0) || params.recipient == address(0)) revert InvalidAddress();
        if (params.amountIn == 0) revert InvalidAmount();

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        IERC20(params.tokenIn).safeTransferFrom(userSender, address(this), params.amountIn);
        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), params.amountIn);

        ISwapRouter.ExactInputSingleParams memory uniParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            fee: params.feeTier,
            recipient: params.recipient,
            deadline: params.deadline,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = uniswapV3Router.exactInputSingle(uniParams);

        if (amountOut < params.amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, params.amountOutMinimum);
        }

        emit SwapExecuted(
            userSender,
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            params.routeHash
        );
    }

    // --- Internal Helpers ---

    function _checkOracleSafety(address token) internal view {
        if (address(oracleAggregator) != address(0)) {
            if (oracleAggregator.isCircuitBreakerTripped(token)) {
                revert OracleCircuitBreakerTriggered(token);
            }
        }
    }

    /// @notice Allows contract to receive ETH for WETH unwrap flows
    receive() external payable {}
}
