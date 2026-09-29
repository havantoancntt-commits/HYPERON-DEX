// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../contracts/HyperonOracleAggregator.sol";

/**
 * @title HyperonOracleAggregatorTest
 * @author HYPERON-DEX Security Team
 * @notice Foundry test suite verifying multi-oracle price consensus and automated circuit breakers.
 * Proves that Circuit Breaker reverts with CircuitBreakerTripped when price shifts >20% within 60 seconds.
 */
contract HyperonOracleAggregatorTest {
    HyperonOracleAggregator public oracle;
    address public owner = address(this);
    address public trustedReporter = address(0x1111);
    address public mockAsset = address(0xAAAA);

    event PriceUpdated(address indexed asset, uint256 price, uint256 volume24h, address indexed reporter);
    event CircuitBreakerTrippedEvent(address indexed asset, uint256 currentPrice, uint256 referencePrice, string reason);

    function setUp() public {
        oracle = new HyperonOracleAggregator(owner);
        oracle.setTrustedSource(trustedReporter, true);
    }

    /// @notice Verifies price updates succeed under normal conditions from trusted reporter
    function testValidPriceUpdate() public {
        uint256 price = 3000 * 10**18;
        uint256 median = 3000 * 10**18;
        uint256 volume = 50_000_000 * 10**18;
        uint256 confidence = 9900;

        oracle.updatePrice(mockAsset, price, median, volume, confidence);

        uint256 fetchedPrice = oracle.getPrice(mockAsset);
        require(fetchedPrice == price, "Price mismatch");
        require(!oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker should not be tripped");
    }

    /// @notice Proves Circuit Breaker reverts correctly with CircuitBreakerTripped when price spikes >20% in 60s
    function testCircuitBreakerTripsOnPriceSpike() public {
        uint256 initialPrice = 3000 * 10**18;
        oracle.updatePrice(mockAsset, initialPrice, initialPrice, 10_000_000 * 10**18, 9800);

        // 25% price spike: 3000 * 1.25 = 3750 ETH/USD (> 20% spike threshold)
        uint256 spikePrice = 3750 * 10**18;
        oracle.updatePrice(mockAsset, spikePrice, spikePrice, 10_000_000 * 10**18, 9800);

        require(oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker must be tripped on >20% spike in 60s");

        // Calling getPrice must revert with CircuitBreakerTripped
        try oracle.getPrice(mockAsset) {
            revert("Expected getPrice to revert on tripped circuit breaker");
        } catch {
            // Success: getPrice reverted as expected due to circuit breaker trip
        }
    }

    /// @notice Verifies circuit breaker trips when price deviates >15% from median reference
    function testCircuitBreakerTripsOnMedianDeviation() public {
        uint256 median = 3000 * 10**18;
        // 16% deviation: 3000 * 1.16 = 3480
        uint256 devPrice = 3480 * 10**18;

        oracle.updatePrice(mockAsset, devPrice, median, 10_000_000 * 10**18, 9500);

        require(oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker must be tripped on >15% deviation");

        try oracle.getPrice(mockAsset) {
            revert("Expected getPrice to revert on tripped circuit breaker");
        } catch {
            // Success: Reverted as expected
        }
    }

    /// @notice Verifies owner can reset circuit breaker after manual inspection
    function testResetCircuitBreaker() public {
        uint256 median = 3000 * 10**18;
        uint256 devPrice = 3500 * 10**18;

        oracle.updatePrice(mockAsset, devPrice, median, 10_000_000 * 10**18, 9500);
        require(oracle.isCircuitBreakerTripped(mockAsset), "Should be tripped");

        oracle.resetCircuitBreaker(mockAsset);
        require(!oracle.isCircuitBreakerTripped(mockAsset), "Should be reset");
    }
}
