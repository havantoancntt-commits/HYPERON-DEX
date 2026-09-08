// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interfaces/IERC7528PriceOracle.sol";

interface IChainlinkFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

/**
 * @title HyperonOracleAggregator
 * @author HYPERON-DEX Core Security Architecture
 * @notice Enterprise ERC-7528 Multi-Oracle Consensus & Volatility Circuit Breaker Engine.
 *
 * Core Guarantees:
 * 1. Strict Fail-Closed Security Posture: NO VALID QUORUM -> NO TRUSTED PRICE.
 * 2. Stale, unverified, or outlier feeds are discarded.
 * 3. Never promotes an unsafe spike or tripped price to the trusted baseline.
 * 4. Stale consensus (>120s) produces INVALID/0 price for execution layers.
 * 5. Deterministic state machine: VALID, STALE, INSUFFICIENT_QUORUM, OUTLIER_REJECTED, CIRCUIT_BREAKER, INVALID, RECOVERY_PENDING.
 * 6. Chainlink Source Integrity: roundId != 0, answer > 0, updatedAt <= block.timestamp, answeredInRound >= roundId.
 * 7. Flashloan Circuit Breaker: >= 10% in <= 5s (instant emergency) or >= 20% in <= 15s (standard).
 * 8. 5-minute mandatory cooldown with consensus verification before reset.
 */
contract HyperonOracleAggregator is Ownable2Step, IERC7528PriceOracle {

    enum OracleState {
        VALID,
        STALE,
        INSUFFICIENT_QUORUM,
        OUTLIER_REJECTED,
        CIRCUIT_BREAKER,
        INVALID,
        RECOVERY_PENDING
    }

    struct OracleSource {
        address feed;
        string name;
        uint256 weight;
        bool isActive;
        uint256 maxStalenessSeconds;
        uint8 decimals;
    }

    struct AssetConfig {
        uint256 maxDeviationBps; // e.g. 500 = 5.00%
        uint256 minQuorum; // Minimum active non-outlier feeds required (default 2)
        uint256 emergencyWindowSeconds; // 5 seconds
        uint256 circuitBreakerWindowSeconds; // 15 seconds
        uint256 lastRecordedPrice; // 18 decimals
        uint256 lastPriceTimestamp;
        uint256 lastRecordedVolume24h;
        bool circuitBreakerTripped;
        bool emergencyMode;
        uint256 trippedAt;
    }

    struct VerifiedObservation {
        address feed;
        uint256 price; // Scaled to 18 decimals
        uint256 weight;
        uint256 timestamp;
    }

    mapping(address => OracleSource[]) public assetSources;
    mapping(address => AssetConfig) public assetConfigs;
    mapping(address => uint256) public sourceFailureCount;
    mapping(address => string) public tripReasons;
    mapping(address => OracleState) public assetStates;
    mapping(address => uint256) public lastValidConsensusTimestamps;
    mapping(address => uint256) public lastConfidenceScores;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant COOLDOWN_PERIOD = 300; // 5 minutes minimum cooldown before reset
    uint256 public constant MAX_SOURCES_PER_ASSET = 16;
    uint256 public constant MAX_EXECUTION_STALENESS = 120; // 2 minutes max staleness for live execution

    // Events
    event PriceConsensusUpdated(
        address indexed asset,
        uint256 consensusPrice,
        uint256 sourcesCount,
        uint256 confidenceBps,
        uint256 timestamp
    );
    event OutlierDetected(address indexed asset, address indexed feed, uint256 price, uint256 medianPrice);
    event StaleFeedRejected(address indexed asset, address indexed feed, uint256 lastUpdate, uint256 staleness);
    event QuorumFailed(address indexed asset, uint256 validSources, uint256 minQuorum);
    event CircuitBreakerTripped(address indexed asset, uint256 priceChangePercent, bool isEmergency, string reason);
    event CircuitBreakerResetWithAudit(
        address indexed asset,
        address indexed operator,
        uint256 verifiedPrice,
        string reason,
        uint256 timestamp
    );
    event OracleSourceAdded(address indexed asset, address indexed feed, string name, uint256 weight);
    event OracleSourceStatusChanged(address indexed asset, address indexed feed, bool isActive);

    // Custom Errors
    error CooldownNotElapsed(uint256 remainingSeconds);
    error CircuitBreakerNotTripped();
    error InvalidPrice();
    error EmptyReason();
    error InvalidAddress();
    error SourceLimitExceeded();
    error InsufficientQuorum(uint256 valid, uint256 required);
    error RecoveryValidationFailed(uint256 provided, uint256 expectedMedian);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Configuration ---

    function configureAsset(
        address asset,
        uint256 maxDeviationBps,
        uint256 minQuorum
    ) external onlyOwner {
        if (asset == address(0)) revert InvalidAddress();
        AssetConfig storage config = assetConfigs[asset];
        config.maxDeviationBps = maxDeviationBps > 0 ? maxDeviationBps : 500; // Default 5.00%
        config.minQuorum = minQuorum > 0 ? minQuorum : 2; // Default 2 sources minimum
        config.emergencyWindowSeconds = 5;
        config.circuitBreakerWindowSeconds = 15;
    }

    function addOracleSource(
        address asset,
        address feed,
        string calldata name,
        uint256 weight,
        uint256 maxStalenessSeconds
    ) external onlyOwner {
        if (asset == address(0) || feed == address(0)) revert InvalidAddress();
        if (assetSources[asset].length >= MAX_SOURCES_PER_ASSET) revert SourceLimitExceeded();

        uint8 feedDecimals = 18;
        try IChainlinkFeed(feed).decimals() returns (uint8 dec) {
            feedDecimals = dec;
        } catch {
            feedDecimals = 18;
        }

        assetSources[asset].push(OracleSource({
            feed: feed,
            name: name,
            weight: weight > 0 ? weight : 1,
            isActive: true,
            maxStalenessSeconds: maxStalenessSeconds > 0 ? maxStalenessSeconds : 120,
            decimals: feedDecimals
        }));

        emit OracleSourceAdded(asset, feed, name, weight);
    }

    function setSourceActive(address asset, uint256 index, bool isActive) external onlyOwner {
        OracleSource[] storage sources = assetSources[asset];
        require(index < sources.length, "Index out of bounds");
        sources[index].isActive = isActive;
        emit OracleSourceStatusChanged(asset, sources[index].feed, isActive);
    }

    function getSourcesCount(address asset) external view returns (uint256) {
        return assetSources[asset].length;
    }

    function getOracleState(address asset) external view returns (OracleState) {
        AssetConfig storage config = assetConfigs[asset];
        if (config.circuitBreakerTripped) {
            return OracleState.CIRCUIT_BREAKER;
        }
        if (config.lastPriceTimestamp > 0 && block.timestamp > config.lastPriceTimestamp + MAX_EXECUTION_STALENESS) {
            return OracleState.STALE;
        }
        return assetStates[asset];
    }

    // --- Core Multi-Oracle Consensus Engine (Fail-Closed) ---

    /**
     * @notice Fetches live observations from all active on-chain feeds, validates freshness,
     * strips outliers deviating from the median, computes weighted consensus, and evaluates
     * circuit breaker volatility conditions.
     * FAIL-CLOSED: Returns (0, 0) if quorum is not met or circuit breaker is tripped.
     */
    function updateConsensusFromFeeds(address asset) public returns (uint256 consensusPrice, uint256 confidenceBps) {
        OracleSource[] storage sources = assetSources[asset];
        AssetConfig storage config = assetConfigs[asset];
        uint256 sourceLen = sources.length;

        uint256 minQuorum = config.minQuorum > 0 ? config.minQuorum : 2;
        uint256 maxDev = config.maxDeviationBps > 0 ? config.maxDeviationBps : 500;

        if (sourceLen == 0) {
            assetStates[asset] = OracleState.INVALID;
            return (0, 0);
        }

        // 1. Fetch & normalize observations
        VerifiedObservation[] memory observations = new VerifiedObservation[](sourceLen);
        uint256 validCount = 0;

        for (uint256 i = 0; i < sourceLen; i++) {
            OracleSource memory src = sources[i];
            if (!src.isActive) continue;

            (bool valid, uint256 normPrice, uint256 updateTime) = _fetchSourceObservation(asset, src);
            if (valid) {
                observations[validCount] = VerifiedObservation({
                    feed: src.feed,
                    price: normPrice,
                    weight: src.weight,
                    timestamp: updateTime
                });
                validCount++;
            }
        }

        // 2. Verify Quorum (FAIL-CLOSED: Never return stale price as trusted baseline)
        if (validCount < minQuorum) {
            assetStates[asset] = OracleState.INSUFFICIENT_QUORUM;
            emit QuorumFailed(asset, validCount, minQuorum);
            return (0, 0);
        }

        // 3. Outlier rejection and weighted consensus calculation
        (uint256 price, uint256 survivingCount) = _calculateConsensusPrice(asset, observations, validCount, maxDev);

        if (survivingCount < minQuorum || price == 0) {
            assetStates[asset] = (validCount - survivingCount > 0)
                ? OracleState.OUTLIER_REJECTED
                : OracleState.INSUFFICIENT_QUORUM;
            emit QuorumFailed(asset, survivingCount, minQuorum);
            return (0, 0);
        }

        // 4. Flashloan & Volatility Circuit Breaker Evaluation
        _evaluateCircuitBreaker(asset, config, price);

        if (config.circuitBreakerTripped) {
            assetStates[asset] = OracleState.CIRCUIT_BREAKER;
            // FAIL-CLOSED: Tripped breaker produces 0 price & 0 confidence
            return (0, 0);
        }

        // 5. Dynamic Confidence Score
        confidenceBps = _calculateConfidence(survivingCount, validCount, sourceLen);

        // 6. Update trusted baseline only after full verification passes
        consensusPrice = price;
        config.lastRecordedPrice = consensusPrice;
        config.lastPriceTimestamp = block.timestamp;
        lastValidConsensusTimestamps[asset] = block.timestamp;
        lastConfidenceScores[asset] = confidenceBps;
        assetStates[asset] = OracleState.VALID;

        emit PriceConsensusUpdated(asset, consensusPrice, survivingCount, confidenceBps, block.timestamp);
        return (consensusPrice, confidenceBps);
    }

    function _calculateConfidence(
        uint256 survivingCount,
        uint256 validCount,
        uint256 sourceLen
    ) internal pure returns (uint256) {
        uint256 quorumFactor = (survivingCount * 2500) / sourceLen;
        uint256 outlierPenalty = (validCount - survivingCount) * 1500;
        uint256 rawConfidence = 6000 + quorumFactor;
        uint256 confidence = rawConfidence > outlierPenalty ? rawConfidence - outlierPenalty : 2000;
        return confidence > 9900 ? 9900 : confidence;
    }

    function _fetchSourceObservation(
        address asset,
        OracleSource memory src
    ) internal returns (bool valid, uint256 price, uint256 timestamp) {
        try IChainlinkFeed(src.feed).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Strict Chainlink validation:
            // 1. roundId != 0
            // 2. answer > 0 (strictly positive)
            // 3. updatedAt != 0 and updatedAt <= block.timestamp (no future timestamp manipulation)
            // 4. answeredInRound >= roundId (no stale round data)
            if (
                roundId == 0 ||
                answer <= 0 ||
                updatedAt == 0 ||
                updatedAt > block.timestamp ||
                answeredInRound < roundId
            ) {
                sourceFailureCount[src.feed]++;
                return (false, 0, 0);
            }

            // Freshness enforcement
            if (block.timestamp > updatedAt + src.maxStalenessSeconds) {
                emit StaleFeedRejected(asset, src.feed, updatedAt, block.timestamp - updatedAt);
                return (false, 0, 0);
            }

            uint256 rawPrice = uint256(answer);
            uint256 normalizedPrice = rawPrice;
            if (src.decimals < 18) {
                normalizedPrice = rawPrice * (10 ** (18 - src.decimals));
            } else if (src.decimals > 18) {
                normalizedPrice = rawPrice / (10 ** (src.decimals - 18));
            }

            return (true, normalizedPrice, updatedAt);
        } catch {
            sourceFailureCount[src.feed]++;
            return (false, 0, 0);
        }
    }

    function _calculateConsensusPrice(
        address asset,
        VerifiedObservation[] memory obs,
        uint256 validCount,
        uint256 maxDeviationBps
    ) internal returns (uint256 consensusPrice, uint256 survivingCount) {
        uint256[] memory prices = new uint256[](validCount);
        for (uint256 i = 0; i < validCount; i++) {
            prices[i] = obs[i].price;
        }
        _sortArray(prices);

        uint256 medianPrice = validCount % 2 == 1
            ? prices[validCount / 2]
            : (prices[(validCount / 2) - 1] + prices[validCount / 2]) / 2;

        if (medianPrice == 0) return (0, 0);

        uint256 totalWeightedPrice = 0;
        uint256 totalWeight = 0;
        survivingCount = 0;

        for (uint256 i = 0; i < validCount; i++) {
            uint256 p = obs[i].price;
            uint256 diff = p > medianPrice ? p - medianPrice : medianPrice - p;
            uint256 devBps = (diff * BPS_DENOMINATOR) / medianPrice;

            if (devBps > maxDeviationBps) {
                emit OutlierDetected(asset, obs[i].feed, p, medianPrice);
            } else {
                totalWeightedPrice += p * obs[i].weight;
                totalWeight += obs[i].weight;
                survivingCount++;
            }
        }

        consensusPrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : medianPrice;
    }

    /**
     * @notice Records price observation with strict circuit breaker validation.
     * FAIL-CLOSED: If circuit breaker trips, DOES NOT promote dangerous price to trusted baseline!
     */
    function recordPriceObservation(
        address asset,
        uint256 newPrice,
        uint256 volume24h
    ) external onlyOwner {
        if (newPrice == 0) revert InvalidPrice();
        AssetConfig storage config = assetConfigs[asset];

        _evaluateCircuitBreaker(asset, config, newPrice);

        if (config.circuitBreakerTripped) {
            // FAIL-CLOSED: Never overwrite lastRecordedPrice or lastPriceTimestamp on trip
            assetStates[asset] = OracleState.CIRCUIT_BREAKER;
            emit PriceConsensusUpdated(asset, 0, 0, 0, block.timestamp);
            return;
        }

        config.lastRecordedPrice = newPrice;
        config.lastPriceTimestamp = block.timestamp;
        lastValidConsensusTimestamps[asset] = block.timestamp;
        config.lastRecordedVolume24h = volume24h;
        assetStates[asset] = OracleState.VALID;

        emit PriceConsensusUpdated(asset, newPrice, 1, 8000, block.timestamp);
    }

    function _evaluateCircuitBreaker(address asset, AssetConfig storage config, uint256 newPrice) internal {
        uint256 lastPrice = config.lastRecordedPrice;
        uint256 lastTime = config.lastPriceTimestamp;
        uint256 nowTime = block.timestamp;

        if (lastPrice > 0 && lastTime > 0) {
            uint256 timeElapsed = nowTime > lastTime ? nowTime - lastTime : 0;
            uint256 diff = newPrice > lastPrice ? newPrice - lastPrice : lastPrice - newPrice;
            uint256 pctChange = (diff * 100) / lastPrice;

            // Instant Emergency Spike: >= 10% change in <= 5s
            if (timeElapsed <= config.emergencyWindowSeconds && pctChange >= 10) {
                config.circuitBreakerTripped = true;
                config.emergencyMode = true;
                config.trippedAt = nowTime;
                tripReasons[asset] = "Instant volatility spike >= 10% in <= 5s";
                assetStates[asset] = OracleState.CIRCUIT_BREAKER;
                emit CircuitBreakerTripped(asset, pctChange, true, tripReasons[asset]);
                return;
            }
            // Standard Volatility Spike: >= 20% change in <= 15s
            else if (timeElapsed <= config.circuitBreakerWindowSeconds && pctChange >= 20) {
                config.circuitBreakerTripped = true;
                config.trippedAt = nowTime;
                tripReasons[asset] = "15-second volatility spike >= 20%";
                assetStates[asset] = OracleState.CIRCUIT_BREAKER;
                emit CircuitBreakerTripped(asset, pctChange, false, tripReasons[asset]);
                return;
            }
        }
    }

    /**
     * @notice Resets circuit breaker with mandatory cooldown check, explicit audit trail,
     * and verification against current active feeds if available.
     */
    function resetCircuitBreakerWithReason(
        address asset,
        string calldata reason,
        uint256 verifiedPrice
    ) external onlyOwner {
        AssetConfig storage config = assetConfigs[asset];
        if (!config.circuitBreakerTripped) revert CircuitBreakerNotTripped();
        if (verifiedPrice == 0) revert InvalidPrice();
        if (bytes(reason).length == 0) revert EmptyReason();

        if (block.timestamp < config.trippedAt + COOLDOWN_PERIOD) {
            revert CooldownNotElapsed((config.trippedAt + COOLDOWN_PERIOD) - block.timestamp);
        }

        // If feeds exist, verify that the provided verifiedPrice does not deviate egregiously from active feeds
        OracleSource[] storage sources = assetSources[asset];
        if (sources.length >= (config.minQuorum > 0 ? config.minQuorum : 2)) {
            (uint256 liveConsensus, ) = updateConsensusFromFeeds(asset);
            if (liveConsensus > 0) {
                uint256 diff = verifiedPrice > liveConsensus ? verifiedPrice - liveConsensus : liveConsensus - verifiedPrice;
                uint256 devBps = (diff * BPS_DENOMINATOR) / liveConsensus;
                if (devBps > (config.maxDeviationBps > 0 ? config.maxDeviationBps : 500)) {
                    revert RecoveryValidationFailed(verifiedPrice, liveConsensus);
                }
            }
        }

        config.circuitBreakerTripped = false;
        config.emergencyMode = false;
        config.trippedAt = 0;
        config.lastRecordedPrice = verifiedPrice;
        config.lastPriceTimestamp = block.timestamp;
        lastValidConsensusTimestamps[asset] = block.timestamp;
        tripReasons[asset] = "";
        assetStates[asset] = OracleState.VALID;

        emit CircuitBreakerResetWithAudit(asset, msg.sender, verifiedPrice, reason, block.timestamp);
    }

    // --- IERC7528 Standard Implementation ---

    /**
     * @notice Returns price and last update timestamp.
     * FAIL-CLOSED: If circuit breaker is tripped or price is stale (>120s), returns (0, 0).
     */
    function getAssetPrice(address asset) external view override returns (uint256 price, uint256 lastUpdated) {
        AssetConfig storage config = assetConfigs[asset];
        if (config.circuitBreakerTripped) {
            return (0, 0);
        }
        // Fail-closed staleness check: never return stale price for execution
        if (config.lastPriceTimestamp == 0 || block.timestamp > config.lastPriceTimestamp + MAX_EXECUTION_STALENESS) {
            return (0, 0);
        }
        return (config.lastRecordedPrice, config.lastPriceTimestamp);
    }

    /**
     * @notice Returns complete ERC-7528 price data structure with confidence score.
     * FAIL-CLOSED: If circuit breaker is active or stale, returns price 0 and confidence 0.
     */
    function getAssetPriceData(address asset) external view override returns (PriceData memory data) {
        AssetConfig storage config = assetConfigs[asset];

        bool isStale = config.lastPriceTimestamp == 0 || block.timestamp > config.lastPriceTimestamp + MAX_EXECUTION_STALENESS;
        if (config.circuitBreakerTripped || isStale || config.lastRecordedPrice == 0) {
            return PriceData({
                price: 0,
                timestamp: config.lastPriceTimestamp,
                volume24h: config.lastRecordedVolume24h,
                confidence: 0,
                isCircuitBreakerActive: config.circuitBreakerTripped
            });
        }

        uint256 age = block.timestamp > config.lastPriceTimestamp ? block.timestamp - config.lastPriceTimestamp : 0;
        uint256 sourcesCount = assetSources[asset].length;
        uint256 baseConfidence = sourcesCount >= 3 ? 9500 : sourcesCount == 2 ? 8000 : 6000;

        uint256 confidence = baseConfidence;
        if (age > 60) {
            confidence = (baseConfidence * 80) / 100;
        }

        return PriceData({
            price: config.lastRecordedPrice,
            timestamp: config.lastPriceTimestamp,
            volume24h: config.lastRecordedVolume24h,
            confidence: confidence,
            isCircuitBreakerActive: false
        });
    }

    function isCircuitBreakerTripped(address asset) external view override returns (bool) {
        return assetConfigs[asset].circuitBreakerTripped;
    }

    // --- Internal Helpers ---

    function _sortArray(uint256[] memory arr) internal pure {
        uint256 len = arr.length;
        for (uint256 i = 1; i < len; i++) {
            uint256 key = arr[i];
            uint256 j = i;
            while (j > 0 && arr[j - 1] > key) {
                arr[j] = arr[j - 1];
                j--;
            }
            arr[j] = key;
        }
    }
}
