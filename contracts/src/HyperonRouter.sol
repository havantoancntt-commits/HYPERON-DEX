// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./interfaces/ISwapRouter.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IERC7528PriceOracle.sol";

/**
 * @title HyperonRouter
 * @author HYPERON-DEX Architecture Team
 * @notice Institutional Non-Custodial Multi-DEX Settlement Router.
 * @dev Implements EIP-712 cryptographic authorization for relayer swaps,
 * strict pool registry/allowlists against malicious pool injections,
 * two-step ownership governance, and ERC-7528 multi-oracle circuit breakers.
 *
 * NOTE: HYPERON-DEX is an independent, non-custodial decentralized exchange protocol,
 * completely unrelated and unaffiliated with the HyperDX project.
 */
contract HyperonRouter is Ownable2Step, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    ISwapRouter public immutable uniswapV3Router;
    IERC7528PriceOracle public oracleAggregator;

    mapping(address => bool) public authorizedRelayers;
    mapping(address => bool) public isTrustedCurvePool;
    mapping(address => bool) public isTrustedVault;
    mapping(address => uint256) public nonces;

    bool public emergencyHaltActive;

    // --- EIP-712 TypeHash ---
    bytes32 public constant RELAY_SWAP_TYPEHASH = keccak256(
        "RelaySwap(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOutMinimum,address recipient,uint24 feeTier,bytes32 routeHash,uint256 deadline,uint256 nonce)"
    );

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
    event TrustedPoolUpdated(address indexed pool, bool status);
    event TrustedVaultUpdated(address indexed vault, bool status);
    event FundsRescued(address indexed token, address indexed to, uint256 amount);

    // --- Custom Errors ---
    error EmergencyHalted();
    error UnauthorizedRelayer();
    error InsufficientOutputAmount(uint256 received, uint256 minimumExpected);
    error InsufficientContractBalance(uint256 available, uint256 required);
    error InvalidAddress();
    error InvalidAmount();
    error ExpiredDeadline();
    error OracleCircuitBreakerTriggered(address asset);
    error UntrustedPool(address pool);
    error UntrustedVault(address vault);
    error InvalidSignature();
    error InvalidNonce(uint256 provided, uint256 expected);
    error RouteCommitmentMismatch(bytes32 provided, bytes32 expected);
    error RouteCommitmentRequired();
    error InvalidPathLength();
    error PathEndpointsMismatch(address expectedIn, address expectedOut, address actualIn, address actualOut);
    error CurveCoinMismatch(address expected, address actual);
    error InvalidIndex();
    error InvalidFeeTier(uint24 feeTier);
    error MaxHopsExceeded(uint256 hops, uint256 maxAllowed);
    error InvalidPath();
    error UnexpectedETH();
    error ETHTransferFailed();

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
    ) Ownable(_initialOwner) EIP712("HyperonRouter", "1") {
        if (_uniswapV3Router == address(0) || _uniswapV3Router.code.length == 0) revert InvalidAddress();
        if (_oracleAggregator == address(0) || _oracleAggregator.code.length == 0) revert InvalidAddress();
        if (_initialOwner == address(0)) revert InvalidAddress();
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
        if (_newOracle == address(0) || _newOracle.code.length == 0) revert InvalidAddress();
        oracleAggregator = IERC7528PriceOracle(_newOracle);
        emit OracleAggregatorUpdated(_newOracle);
    }

    function setEmergencyHalt(bool _halted, string calldata reason) external onlyOwner {
        emergencyHaltActive = _halted;
        emit EmergencyHaltUpdated(_halted, reason);
    }

    function setTrustedCurvePool(address pool, bool status) external onlyOwner {
        if (pool == address(0)) revert InvalidAddress();
        isTrustedCurvePool[pool] = status;
        emit TrustedPoolUpdated(pool, status);
    }

    function setTrustedVault(address vault, bool status) external onlyOwner {
        if (vault == address(0)) revert InvalidAddress();
        isTrustedVault[vault] = status;
        emit TrustedVaultUpdated(vault, status);
    }

    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    function computeSingleRouteHash(
        address tokenIn,
        address tokenOut,
        uint24 feeTier,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                tokenIn,
                tokenOut,
                feeTier,
                amountIn,
                amountOutMinimum,
                recipient,
                deadline,
                bytes32("SINGLE_SWAP")
            )
        );
    }

    function computeMultiHopRouteHash(
        bytes calldata path,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                tokenIn,
                tokenOut,
                keccak256(path),
                amountIn,
                amountOutMinimum,
                recipient,
                deadline,
                bytes32("MULTI_HOP_SWAP")
            )
        );
    }

    function computeCurveRouteHash(
        address curvePool,
        address tokenIn,
        address tokenOut,
        int128 i,
        int128 j,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                curvePool,
                tokenIn,
                tokenOut,
                i,
                j,
                amountIn,
                minAmountOut,
                recipient,
                bytes32("CURVE_SWAP")
            )
        );
    }

    function computeRelayRouteHash(
        address user,
        address tokenIn,
        address tokenOut,
        uint24 feeTier,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline,
        uint256 nonce
    ) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                user,
                tokenIn,
                tokenOut,
                feeTier,
                amountIn,
                amountOutMinimum,
                recipient,
                deadline,
                nonce,
                bytes32("RELAY_SWAP")
            )
        );
    }

    function _getCurveCoin(address pool, int128 index) internal view returns (address) {
        if (index < 0) revert InvalidIndex();
        (bool success, bytes memory data) = pool.staticcall(
            abi.encodeWithSelector(0xc6610657, uint256(uint128(index)))
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (address));
        }
        (bool success128, bytes memory data128) = pool.staticcall(
            abi.encodeWithSelector(0x87d46816, index)
        );
        if (success128 && data128.length >= 32) {
            return abi.decode(data128, (address));
        }
        revert UntrustedPool(pool);
    }

    function _verifyCurveCoins(
        address pool,
        address tokenIn,
        address tokenOut,
        int128 i,
        int128 j
    ) internal view {
        if (i == j) revert InvalidIndex();
        address coinI = _getCurveCoin(pool, i);
        address coinJ = _getCurveCoin(pool, j);
        if (coinI != tokenIn) revert CurveCoinMismatch(tokenIn, coinI);
        if (coinJ != tokenOut) revert CurveCoinMismatch(tokenOut, coinJ);
    }

    function _verifyPath(bytes calldata path, address tokenIn, address tokenOut) internal view {
        if (path.length < 43 || (path.length - 20) % 23 != 0) {
            revert InvalidPathLength();
        }
        uint256 hops = (path.length - 20) / 23;
        if (hops > 4) {
            revert MaxHopsExceeded(hops, 4);
        }

        address currentToken;
        assembly {
            currentToken := shr(96, calldataload(path.offset))
        }
        if (currentToken != tokenIn || currentToken == address(0)) {
            revert PathEndpointsMismatch(tokenIn, tokenOut, currentToken, address(0));
        }

        for (uint256 h = 0; h < hops; h++) {
            uint24 fee;
            address nextToken;
            assembly {
                let feeOffset := add(add(path.offset, 20), mul(h, 23))
                let nextTokenOffset := add(feeOffset, 3)
                fee := shr(232, calldataload(feeOffset))
                nextToken := shr(96, calldataload(nextTokenOffset))
            }
            if (fee != 100 && fee != 500 && fee != 3000 && fee != 10000) {
                revert InvalidFeeTier(fee);
            }
            if (nextToken == address(0) || nextToken == currentToken) {
                revert InvalidPath();
            }
            _checkOracleSafety(nextToken);
            currentToken = nextToken;
        }

        if (currentToken != tokenOut) {
            revert PathEndpointsMismatch(tokenIn, tokenOut, tokenIn, currentToken);
        }
    }

    function _verifyPathEndpoints(bytes calldata path, address tokenIn, address tokenOut) internal view {
        _verifyPath(path, tokenIn, tokenOut);
    }

    // --- Core Swap Interfaces ---

    struct SingleSwapParams {
        address tokenIn;
        address tokenOut;
        uint24 feeTier;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        bytes32 routeHash;
    }

    /**
     * @notice Executes a single-hop swap through Uniswap V3 with slippage enforcement.
     */
    function swapExactInputSingle(
        SingleSwapParams calldata params
    ) external payable nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (msg.value > 0) revert UnexpectedETH();
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0)) revert InvalidAddress();

        if (params.routeHash == bytes32(0)) revert RouteCommitmentRequired();
        bytes32 expected = computeSingleRouteHash(
            params.tokenIn,
            params.tokenOut,
            params.feeTier,
            params.amountIn,
            params.amountOutMinimum,
            params.recipient,
            params.deadline
        );
        if (params.routeHash != expected) {
            revert RouteCommitmentMismatch(params.routeHash, expected);
        }

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        uint256 balanceBefore = IERC20(params.tokenIn).balanceOf(address(this));
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        uint256 actualAmountIn = IERC20(params.tokenIn).balanceOf(address(this)) - balanceBefore;
        if (actualAmountIn == 0) revert InvalidAmount();

        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), actualAmountIn);

        ISwapRouter.ExactInputSingleParams memory uniParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            fee: params.feeTier,
            recipient: params.recipient,
            deadline: params.deadline,
            amountIn: actualAmountIn,
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
            actualAmountIn,
            amountOut,
            params.routeHash
        );
    }

    struct MultiHopSwapParams {
        bytes path;
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
     */
    function swapExactInputMultiple(
        MultiHopSwapParams calldata params
    ) external payable nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (msg.value > 0) revert UnexpectedETH();
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0)) revert InvalidAddress();

        if (params.routeHash == bytes32(0)) revert RouteCommitmentRequired();
        _verifyPathEndpoints(params.path, params.tokenIn, params.tokenOut);
        bytes32 expected = computeMultiHopRouteHash(
            params.path,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.amountOutMinimum,
            params.recipient,
            params.deadline
        );
        if (params.routeHash != expected) {
            revert RouteCommitmentMismatch(params.routeHash, expected);
        }

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        uint256 balanceBefore = IERC20(params.tokenIn).balanceOf(address(this));
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        uint256 actualAmountIn = IERC20(params.tokenIn).balanceOf(address(this)) - balanceBefore;
        if (actualAmountIn == 0) revert InvalidAmount();

        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), actualAmountIn);

        ISwapRouter.ExactInputParams memory uniParams = ISwapRouter.ExactInputParams({
            path: params.path,
            recipient: params.recipient,
            deadline: params.deadline,
            amountIn: actualAmountIn,
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
            actualAmountIn,
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
     * @notice Executes a swap through an explicitly trusted Curve StableSwap pool.
     * Prevents arbitrary untrusted pool injection and allowance theft.
     */
    function swapCurveStable(
        CurveSwapParams calldata params
    ) external nonReentrant whenNotHalted returns (uint256 amountOut) {
        if (params.amountIn == 0) revert InvalidAmount();
        if (params.recipient == address(0) || params.curvePool == address(0)) revert InvalidAddress();
        if (!isTrustedCurvePool[params.curvePool]) revert UntrustedPool(params.curvePool);
        if (params.routeHash == bytes32(0)) revert RouteCommitmentRequired();
        bytes32 expected = computeCurveRouteHash(
            params.curvePool,
            params.tokenIn,
            params.tokenOut,
            params.i,
            params.j,
            params.amountIn,
            params.minAmountOut,
            params.recipient
        );
        if (params.routeHash != expected) {
            revert RouteCommitmentMismatch(params.routeHash, expected);
        }

        _verifyCurveCoins(params.curvePool, params.tokenIn, params.tokenOut, params.i, params.j);

        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        uint256 balanceBefore = IERC20(params.tokenIn).balanceOf(address(this));
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        uint256 actualAmountIn = IERC20(params.tokenIn).balanceOf(address(this)) - balanceBefore;
        if (actualAmountIn == 0) revert InvalidAmount();

        IERC20(params.tokenIn).forceApprove(params.curvePool, actualAmountIn);

        amountOut = ICurvePool(params.curvePool).exchange(
            params.i,
            params.j,
            actualAmountIn,
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
            actualAmountIn,
            amountOut,
            params.routeHash
        );
    }

    // --- EIP-4626 Tokenized Vault Integration (Trusted Only) ---

    function depositToVault(
        address vault,
        uint256 assets,
        address recipient
    ) external nonReentrant whenNotHalted returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();
        if (recipient == address(0) || vault == address(0)) revert InvalidAddress();
        if (!isTrustedVault[vault]) revert UntrustedVault(vault);

        address underlying = IERC4626(vault).asset();
        if (underlying == address(0)) revert InvalidAddress();
        uint256 balanceBefore = IERC20(underlying).balanceOf(address(this));
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), assets);
        uint256 actualAssets = IERC20(underlying).balanceOf(address(this)) - balanceBefore;
        if (actualAssets == 0) revert InvalidAmount();

        IERC20(underlying).forceApprove(vault, actualAssets);
        shares = IERC4626(vault).deposit(actualAssets, recipient);
        if (shares == 0) revert InvalidAmount();
    }

    function redeemFromVault(
        address vault,
        uint256 shares,
        address recipient
    ) external nonReentrant whenNotHalted returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();
        if (recipient == address(0) || vault == address(0)) revert InvalidAddress();
        if (!isTrustedVault[vault]) revert UntrustedVault(vault);

        uint256 balanceBefore = IERC20(vault).balanceOf(address(this));
        IERC20(vault).safeTransferFrom(msg.sender, address(this), shares);
        uint256 actualShares = IERC20(vault).balanceOf(address(this)) - balanceBefore;
        if (actualShares == 0) revert InvalidAmount();

        assets = IERC4626(vault).redeem(actualShares, recipient, address(this));
        if (assets == 0) revert InvalidAmount();
    }

    // --- EIP-712 Cryptographically Authorized Relayer Swap Execution ---

    struct RelaySwapParams {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMinimum;
        address recipient;
        uint24 feeTier;
        bytes32 routeHash;
        uint256 deadline;
        uint256 nonce;
    }

    /**
     * @notice Allows an authorized relayer to broadcast a swap on behalf of a user who signed an EIP-712 authorization.
     * Enforces signature validity, strict nonce sequence (replay protection), deadline, and full parameter binding.
     */
    function relaySwap(
        RelaySwapParams calldata params,
        bytes calldata signature
    ) external onlyRelayer nonReentrant whenNotHalted checkDeadline(params.deadline) returns (uint256 amountOut) {
        if (params.user == address(0) || params.recipient == address(0)) revert InvalidAddress();
        if (params.tokenIn == address(0) || params.tokenOut == address(0) || params.tokenIn == params.tokenOut) {
            revert InvalidAddress();
        }
        if (params.amountIn == 0) revert InvalidAmount();

        // Strict per-user nonce check
        uint256 expectedNonce = nonces[params.user];
        if (params.nonce != expectedNonce) {
            revert InvalidNonce(params.nonce, expectedNonce);
        }
        // Consume nonce immediately for atomic replay protection
        nonces[params.user] = expectedNonce + 1;

        // Verify cryptographic EIP-712 signature
        _verifyRelaySignature(params, signature);

        // Strict Route Commitment Verification
        if (params.routeHash == bytes32(0)) revert RouteCommitmentRequired();
        bytes32 expectedRouteHash = computeRelayRouteHash(
            params.user,
            params.tokenIn,
            params.tokenOut,
            params.feeTier,
            params.amountIn,
            params.amountOutMinimum,
            params.recipient,
            params.deadline,
            params.nonce
        );
        if (params.routeHash != expectedRouteHash) {
            revert RouteCommitmentMismatch(params.routeHash, expectedRouteHash);
        }

        // Pre-swap oracle safety check
        _checkOracleSafety(params.tokenIn);
        _checkOracleSafety(params.tokenOut);

        // Execute swap and verify output
        amountOut = _executeRelayedSwap(params);
    }

    function _hashRelaySwap(RelaySwapParams calldata params) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                RELAY_SWAP_TYPEHASH,
                params.user,
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                params.amountOutMinimum,
                params.recipient,
                params.feeTier,
                params.routeHash,
                params.deadline,
                params.nonce
            )
        );
    }

    function _verifyRelaySignature(RelaySwapParams calldata params, bytes calldata signature) internal view {
        bytes32 digest = _hashTypedDataV4(_hashRelaySwap(params));
        address recoveredSigner = ECDSA.recover(digest, signature);
        if (recoveredSigner != params.user) {
            revert InvalidSignature();
        }
    }

    function _executeRelayedSwap(RelaySwapParams calldata params) internal returns (uint256 amountOut) {
        uint256 balanceBefore = IERC20(params.tokenIn).balanceOf(address(this));
        IERC20(params.tokenIn).safeTransferFrom(params.user, address(this), params.amountIn);
        uint256 actualAmountIn = IERC20(params.tokenIn).balanceOf(address(this)) - balanceBefore;
        if (actualAmountIn == 0) revert InvalidAmount();

        IERC20(params.tokenIn).forceApprove(address(uniswapV3Router), actualAmountIn);

        amountOut = uniswapV3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.feeTier,
                recipient: params.recipient,
                deadline: params.deadline,
                amountIn: actualAmountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        if (amountOut < params.amountOutMinimum) {
            revert InsufficientOutputAmount(amountOut, params.amountOutMinimum);
        }

        emit SwapExecuted(
            params.user,
            params.recipient,
            params.tokenIn,
            params.tokenOut,
            actualAmountIn,
            amountOut,
            params.routeHash
        );
    }

    // --- Internal Helpers ---

    function _checkOracleSafety(address token) internal view {
        if (address(oracleAggregator) == address(0) || address(oracleAggregator).code.length == 0) {
            revert InvalidAddress();
        }
        try oracleAggregator.isCircuitBreakerTripped(token) returns (bool tripped) {
            if (tripped) revert OracleCircuitBreakerTriggered(token);
        } catch {
            revert OracleCircuitBreakerTriggered(token);
        }

        try oracleAggregator.getAssetPriceData(token) returns (IERC7528PriceOracle.PriceData memory data) {
            if (data.isCircuitBreakerActive) {
                revert OracleCircuitBreakerTriggered(token);
            }
        } catch {
            revert OracleCircuitBreakerTriggered(token);
        }
    }

    /**
     * @notice Rescues accidentally trapped ERC-20 tokens or native ETH.
     * Restricted strictly to contract owner with non-reentrant guard.
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

    /// @notice Allows contract to receive ETH for WETH unwrap flows
    receive() external payable {}
}
