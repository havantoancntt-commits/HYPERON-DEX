// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../HyperonOracleAggregator.sol";

/**
 * @title HyperonOracleAggregatorTest
 * @notice Foundry test suite verifying multi-oracle price consensus and automated circuit breakers.
 */
contract HyperonOracleAggregatorTest {
    HyperonOracleAggregator public oracle;
    address public owner = address(this);
    address public trustedReporter = address(0x1111);
    address public unauthorizedReporter = address(0x9999);
    address public mockAsset = address(0xAAAA);

    event PriceUpdated(address indexed asset, uint256 price, uint256 volume24h, address indexed reporter);
    event CircuitBreakerTrippedEvent(address indexed asset, uint256 currentPrice, uint256 referencePrice, string reason);

    function setUp() public {
        oracle = new HyperonOracleAggregator(owner);
        oracle.setTrustedSource(trustedReporter, true);
    }

    /// @notice Verifies price updates succeed from trusted reporter
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

    /// @notice Verifies circuit breaker trips when price deviates >15% from median
    function testCircuitBreakerTripsOnMedianDeviation() public {
        uint256 median = 3000 * 10**18;
        // 16% deviation: 3000 * 1.16 = 3480
        uint256 devPrice = 3480 * 10**18;

        oracle.updatePrice(mockAsset, devPrice, median, 10_000_000 * 10**18, 9500);

        require(oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker must be tripped on >15% deviation");
        
        // Querying getPrice must revert when circuit breaker is tripped
        try oracle.getPrice(mockAsset) {
            revert("Expected getPrice to revert on tripped circuit breaker");
        } catch {
            // Success: Reverted as expected
        }
    }

    /// @notice Verifies circuit breaker trips when price spikes >20% within 60s
    function testCircuitBreakerTripsOnPriceSpike() public {
        uint256 initialPrice = 3000 * 10**18;
        oracle.updatePrice(mockAsset, initialPrice, initialPrice, 10_000_000 * 10**18, 9800);

        // 25% spike: 3000 * 1.25 = 3750
        uint256 spikePrice = 3750 * 10**18;
        oracle.updatePrice(mockAsset, spikePrice, spikePrice, 10_000_000 * 10**18, 9800);

        require(oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker must be tripped on >20% spike in 60s");

        try oracle.getPrice(mockAsset) {
            revert("Expected getPrice to revert on tripped circuit breaker");
        } catch {
            // Success: Reverted as expected
        }
    }

    /// @notice Verifies owner can reset circuit breaker after investigation
    function testResetCircuitBreaker() public {
        uint256 median = 3000 * 10**18;
        uint256 devPrice = 3500 * 10**18;

        oracle.updatePrice(mockAsset, devPrice, median, 10_000_000 * 10**18, 9500);
        require(oracle.isCircuitBreakerTripped(mockAsset), "Should be tripped");

        oracle.resetCircuitBreaker(mockAsset);
        require(!oracle.isCircuitBreakerTripped(mockAsset), "Should be reset");
    }
}
