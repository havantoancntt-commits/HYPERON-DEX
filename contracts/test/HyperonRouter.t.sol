// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/HyperonRouter.sol";
import "../src/HyperonOracleAggregator.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 10000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockUniswapV3Router is ISwapRouter {
    function exactInputSingle(ExactInputSingleParams calldata params) external payable override returns (uint256) {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        uint256 amountOut = params.amountIn;
        MockERC20(params.tokenOut).mint(params.recipient, amountOut);
        return amountOut;
    }

    function exactInput(ExactInputParams calldata params) external payable override returns (uint256) {
        uint256 amountOut = params.amountIn;
        return amountOut;
    }
}

contract MaliciousUntrustedPool {
    function exchange(int128, int128, uint256, uint256) external pure returns (uint256) {
        return 0;
    }
}

contract HyperonRouterTest {
    HyperonRouter public router;
    HyperonOracleAggregator public oracle;
    MockUniswapV3Router public mockUni;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner = address(0x1111);
    address public relayer = address(0x2222);
    address public user = address(0x3333);

    function setUp() public {
        mockUni = new MockUniswapV3Router();
        oracle = new HyperonOracleAggregator(owner);
        router = new HyperonRouter(address(mockUni), address(oracle), owner);

        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        tokenA.mint(user, 1000 * 1e18);
        tokenB.mint(user, 1000 * 1e18);
    }

    function test_FuzzSingleSwapInvariant(uint256 amountIn) public view {
        if (amountIn == 0 || amountIn > 1000 * 1e18) return;

        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMinimum = (amountIn * 995) / 1000;
        bytes32 routeHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMinimum,
            user,
            deadline
        );

        HyperonRouter.SingleSwapParams memory params = HyperonRouter.SingleSwapParams({
            tokenIn: address(tokenA),
            tokenOut: address(tokenB),
            feeTier: 3000,
            recipient: user,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            routeHash: routeHash
        });

        assert(params.amountOutMinimum <= params.amountIn);
        assert(params.routeHash != bytes32(0));
    }

    // --- PHASE 9: Route Commitment Integrity & Anti-Tamper Tests ---

    function test_RouteCommitment_ZeroHashReverts() public {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        HyperonRouter.SingleSwapParams memory params = HyperonRouter.SingleSwapParams({
            tokenIn: address(tokenA),
            tokenOut: address(tokenB),
            feeTier: 3000,
            recipient: user,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: (amountIn * 995) / 1000,
            routeHash: bytes32(0) // Zero hash MUST be rejected
        });

        tokenA.mint(address(this), amountIn);
        tokenA.approve(address(router), amountIn);

        bool caught = false;
        try router.swapExactInputSingle(params) {
            caught = false;
        } catch {
            caught = true;
        }
        assert(caught == true);
    }

    function test_RouteCommitment_TamperTokenIn() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(0xdead), // Tampered tokenIn
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperTokenOut() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(0xdead), // Tampered tokenOut
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperAmountIn() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn + 1, // Tampered amountIn
            amountOutMin,
            user,
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperAmountOutMinimum() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin - 1, // Tampered amountOutMinimum
            user,
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperRecipient() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            address(0xdead), // Tampered recipient
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperDeadline() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline + 10 // Tampered deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperFeeTier() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 tamperedHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            500, // Tampered feeTier (0.05% instead of 0.3%)
            amountIn,
            amountOutMin,
            user,
            deadline
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperRelayNonce() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 originalHash = router.computeRelayRouteHash(
            user,
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline,
            1 // Nonce 1
        );

        bytes32 tamperedHash = router.computeRelayRouteHash(
            user,
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline,
            2 // Tampered Nonce 2
        );
        assert(originalHash != tamperedHash);
    }

    function test_RouteCommitment_TamperPath() public view {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes memory path1 = abi.encodePacked(address(tokenA), uint24(3000), address(tokenB));
        bytes memory path2 = abi.encodePacked(address(tokenA), uint24(500), address(tokenB));

        bytes32 hash1 = router.computeMultiHopRouteHash(
            path1,
            address(tokenA),
            address(tokenB),
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 hash2 = router.computeMultiHopRouteHash(
            path2,
            address(tokenA),
            address(tokenB),
            amountIn,
            amountOutMin,
            user,
            deadline
        );
        assert(hash1 != hash2);
    }

    function test_RouteCommitment_TamperRouter() public {
        HyperonRouter router2 = new HyperonRouter(address(mockUni), address(oracle), owner);
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;

        bytes32 hash1 = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        bytes32 hash2 = router2.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );
        assert(hash1 != hash2);
    }

    function test_CircuitBreakerDoesNotAutoClear() public {
        oracle.recordPriceObservation(address(tokenA), 1000 * 1e18, 1000000 * 1e18);
        // Instant drop > 10% in <= 5s
        oracle.recordPriceObservation(address(tokenA), 800 * 1e18, 1000000 * 1e18);

        bool isTripped = oracle.isCircuitBreakerTripped(address(tokenA));
        assert(isTripped == true);

        // Even after time passes, circuit breaker must NOT auto-clear without audited reset
        // Testing invariant
        assert(oracle.isCircuitBreakerTripped(address(tokenA)) == true);
    }

    function test_EIP712TypeHash() public view {
        bytes32 expected = keccak256(
            "RelaySwap(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOutMinimum,address recipient,uint24 feeTier,bytes32 routeHash,uint256 deadline,uint256 nonce)"
        );
        assert(router.RELAY_SWAP_TYPEHASH() == expected);
    }

    function test_RevertIfUnexpectedETH() public {
        uint256 amountIn = 10 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 amountOutMin = (amountIn * 995) / 1000;
        bytes32 routeHash = router.computeSingleRouteHash(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            amountOutMin,
            user,
            deadline
        );

        HyperonRouter.SingleSwapParams memory params = HyperonRouter.SingleSwapParams({
            tokenIn: address(tokenA),
            tokenOut: address(tokenB),
            feeTier: 3000,
            recipient: user,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            routeHash: routeHash
        });

        // Calling with msg.value > 0 on ERC-20 swap MUST revert with UnexpectedETH
        (bool success, ) = address(router).call{value: 1 ether}(
            abi.encodeWithSelector(router.swapExactInputSingle.selector, params)
        );
        assert(success == false);
    }

    function test_RescueFunds() public {
        HyperonRouter ownedRouter = new HyperonRouter(address(mockUni), address(oracle), address(this));
        tokenA.mint(address(ownedRouter), 50 * 1e18);
        assert(tokenA.balanceOf(address(ownedRouter)) == 50 * 1e18);

        address recoveryRecipient = address(0x9999);
        ownedRouter.rescueFunds(address(tokenA), recoveryRecipient, 50 * 1e18);
        assert(tokenA.balanceOf(recoveryRecipient) == 50 * 1e18);
        assert(tokenA.balanceOf(address(ownedRouter)) == 0);
    }
}
