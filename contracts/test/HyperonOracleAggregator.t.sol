// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../src/HyperonOracleAggregator.sol";

contract MockChainlinkFeed is IChainlinkFeed {
    int256 public answer;
    uint256 public updatedAt;
    uint8 public override decimals;

    constructor(int256 _answer, uint8 _decimals) {
        answer = _answer;
        decimals = _decimals;
        updatedAt = block.timestamp;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 _answer,
        uint256 startedAt,
        uint256 _updatedAt,
        uint80 answeredInRound
    ) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

/**
 * @title HyperonOracleAggregatorTest
 * @author HYPERON-DEX Security Architecture
 * @notice Foundry test suite verifying multi-oracle price consensus and automated circuit breakers.
 */
contract HyperonOracleAggregatorTest {
    HyperonOracleAggregator public oracle;
    address public owner = address(this);
    address public mockAsset = address(0xAAAA);

    MockChainlinkFeed public feedA;
    MockChainlinkFeed public feedB;
    MockChainlinkFeed public feedC;

    function setUp() public {
        oracle = new HyperonOracleAggregator(owner);
        oracle.configureAsset(mockAsset, 500, 2); // 5% max deviation, quorum 2

        feedA = new MockChainlinkFeed(3000 * 10**8, 8);
        feedB = new MockChainlinkFeed(3010 * 10**8, 8);
        feedC = new MockChainlinkFeed(2995 * 10**8, 8);

        oracle.addOracleSource(mockAsset, address(feedA), "Chainlink Primary", 1, 300);
        oracle.addOracleSource(mockAsset, address(feedB), "Pyth Secondary", 1, 300);
        oracle.addOracleSource(mockAsset, address(feedC), "Uniswap TWAP", 1, 300);
    }

    /// @notice Verifies price consensus succeeds across valid multi-source feeds
    function testValidPriceConsensus() public {
        (uint256 consensusPrice, uint256 confidence) = oracle.updateConsensusFromFeeds(mockAsset);
        require(consensusPrice > 0, "Consensus price must be > 0");
        require(confidence > 6000, "Confidence score must be high");
        require(!oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker should not be tripped");

        (uint256 price, uint256 lastUpdated) = oracle.getAssetPrice(mockAsset);
        require(price == consensusPrice, "getAssetPrice mismatch");
        require(lastUpdated == block.timestamp, "lastUpdated must match current block");
    }

    /// @notice Verifies outlier rejection when a malicious or faulty feed deviates
    function testOutlierRejection() public {
        // Feed C deviates by +30% ($3900)
        feedC.setAnswer(3900 * 10**8);

        (uint256 consensusPrice, ) = oracle.updateConsensusFromFeeds(mockAsset);
        require(consensusPrice > 0, "Consensus must survive outlier rejection with remaining quorum");
        require(consensusPrice < 3100 * 10**18, "Consensus must exclude $3900 outlier");
    }

    /// @notice Verifies circuit breaker trips when price spikes violently (>20%)
    function testCircuitBreakerTripsOnPriceSpike() public {
        oracle.updateConsensusFromFeeds(mockAsset);

        // Spike price by +25% across all feeds
        feedA.setAnswer(3750 * 10**8);
        feedB.setAnswer(3760 * 10**8);
        feedC.setAnswer(3740 * 10**8);

        (uint256 price, ) = oracle.updateConsensusFromFeeds(mockAsset);
        require(price == 0, "Tripped circuit breaker must fail-closed and return 0");
        require(oracle.isCircuitBreakerTripped(mockAsset), "Circuit breaker must be tripped");

        // getAssetPrice must return (0, 0) when circuit breaker is tripped
        (uint256 failPrice, ) = oracle.getAssetPrice(mockAsset);
        require(failPrice == 0, "getAssetPrice must return 0 on tripped circuit breaker");
    }
}
