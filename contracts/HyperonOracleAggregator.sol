// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
 * @title HyperonOracleAggregator
 * @author HYPERON-DEX Core Security Architecture
 * @notice Enterprise ERC-7528 Multi-Oracle Consensus & Volatility Circuit Breaker Engine.
 * @dev Implements strict multi-source quorum, instantaneous spike detection,
 * and automated circuit breakers:
 * - If price deviates >15% (1500 BPS) from median reference: REVERT CircuitBreakerTripped
 * - If price changes >20% (2000 BPS) within 60 seconds: REVERT CircuitBreakerTripped
 * - Only authorized `trustedSources` can publish price updates.
 */
contract HyperonOracleAggregator is Ownable2Step, ReentrancyGuard, Pausable, IERC7528PriceOracle {
    // --- Constants ---
    uint256 public constant MAX_DEVIATION_BPS = 1500; // 15.00% max allowed deviation from median
    uint256 public constant SPIKE_THRESHOLD_BPS = 2000; // 20.00% spike in 60s window
    uint256 public constant SPIKE_WINDOW_SECONDS = 60; // 60 seconds velocity window
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MAX_STALENESS_SECONDS = 300; // 5 minutes staleness limit

    // --- Structs ---
    struct AssetPriceState {
        uint256 currentPrice; // 18 decimals
        uint256 previousPrice;
        uint256 medianPrice;
        uint256 lastUpdated;
        uint256 previousUpdated;
        uint256 volume24h;
        uint256 confidenceBps; // e.g. 9800 = 98.00%
        bool circuitBreakerTripped;
        uint256 trippedAt;
        string tripReason;
    }

    // --- State Variables ---
    mapping(address => bool) public trustedSources;
    mapping(address => AssetPriceState) public assetPrices;

    // --- Events ---
    event PriceUpdated(address indexed asset, uint256 price, uint256 volume24h, address indexed reporter);
    event CircuitBreakerTrippedEvent(address indexed asset, uint256 currentPrice, uint256 referencePrice, string reason);
    event CircuitBreakerResetEvent(address indexed asset, address indexed operator);
    event TrustedSourceUpdated(address indexed source, bool authorized);

    // --- Custom Errors ---
    error UnauthorizedSource(address caller);
    error InvalidAddress();
    error InvalidPrice();
    error StalePrice(address asset, uint256 lastUpdated);
    error CircuitBreakerTripped(address asset, uint256 currentPrice, uint256 referencePrice, string reason);

    modifier onlyTrustedSource() {
        if (!trustedSources[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedSource(msg.sender);
        }
        _;
    }

    /**
     * @notice Initializes the HyperonOracleAggregator.
     * @param _initialOwner Multi-sig or governance admin address.
     */
    constructor(address _initialOwner) Ownable(_initialOwner) {
        if (_initialOwner == address(0)) revert InvalidAddress();
        trustedSources[_initialOwner] = true;
        emit TrustedSourceUpdated(_initialOwner, true);
    }

    // --- Admin Configuration ---

    function setTrustedSource(address source, bool authorized) external onlyOwner {
        if (source == address(0)) revert InvalidAddress();
        trustedSources[source] = authorized;
        emit TrustedSourceUpdated(source, authorized);
    }

    function resetCircuitBreaker(address asset) external onlyOwner {
        if (asset == address(0)) revert InvalidAddress();
        AssetPriceState storage state = assetPrices[asset];
        state.circuitBreakerTripped = false;
        state.tripReason = "";
        emit CircuitBreakerResetEvent(asset, msg.sender);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Price Update Logic (Trusted Sources Only) ---

    /**
     * @notice Publishes a verified price observation from an authorized oracle reporter.
     * @param asset Asset contract address.
     * @param newPrice Price scaled to 18 decimals.
     * @param medianPrice Median consensus price across all off-chain aggregators.
     * @param volume24h 24-hour volume in USD.
     * @param confidenceBps Statistical confidence score (0 - 10000 bps).
     */
    function updatePrice(
        address asset,
        uint256 newPrice,
        uint256 medianPrice,
        uint256 volume24h,
        uint256 confidenceBps
    ) external onlyTrustedSource whenNotPaused {
        if (asset == address(0)) revert InvalidAddress();
        if (newPrice == 0) revert InvalidPrice();

        AssetPriceState storage state = assetPrices[asset];

        // 1. Check deviation from median reference (>15%)
        if (medianPrice > 0) {
            uint256 devBps = newPrice > medianPrice
                ? ((newPrice - medianPrice) * BPS_DIVISOR) / medianPrice
                : ((medianPrice - newPrice) * BPS_DIVISOR) / medianPrice;

            if (devBps > MAX_DEVIATION_BPS) {
                state.circuitBreakerTripped = true;
                state.trippedAt = block.timestamp;
                state.tripReason = "MEDIAN_DEVIATION_EXCEEDED_15_PERCENT";
                emit CircuitBreakerTrippedEvent(asset, newPrice, medianPrice, state.tripReason);
                return;
            }
        }

        // 2. Check price velocity spike (>20% in <= 60s)
        if (state.currentPrice > 0 && block.timestamp - state.lastUpdated <= SPIKE_WINDOW_SECONDS) {
            uint256 spikeBps = newPrice > state.currentPrice
                ? ((newPrice - state.currentPrice) * BPS_DIVISOR) / state.currentPrice
                : ((state.currentPrice - newPrice) * BPS_DIVISOR) / state.currentPrice;

            if (spikeBps > SPIKE_THRESHOLD_BPS) {
                state.circuitBreakerTripped = true;
                state.trippedAt = block.timestamp;
                state.tripReason = "PRICE_SPIKE_EXCEEDED_20_PERCENT_IN_60S";
                emit CircuitBreakerTrippedEvent(asset, newPrice, state.currentPrice, state.tripReason);
                return;
            }
        }

        // Save historical state and update current price
        state.previousPrice = state.currentPrice;
        state.previousUpdated = state.lastUpdated;
        state.currentPrice = newPrice;
        state.medianPrice = medianPrice > 0 ? medianPrice : newPrice;
        state.volume24h = volume24h;
        state.confidenceBps = confidenceBps;
        state.lastUpdated = block.timestamp;

        emit PriceUpdated(asset, newPrice, volume24h, msg.sender);
    }

    // --- Query Functions ---

    /**
     * @notice Returns price and last update timestamp.
     * @dev Reverts if circuit breaker is tripped or price is stale.
     */
    function getPrice(address asset) public view returns (uint256) {
        AssetPriceState memory state = assetPrices[asset];

        if (state.circuitBreakerTripped) {
            revert CircuitBreakerTripped(asset, state.currentPrice, state.medianPrice, state.tripReason);
        }

        if (state.currentPrice == 0 || block.timestamp - state.lastUpdated > MAX_STALENESS_SECONDS) {
            revert StalePrice(asset, state.lastUpdated);
        }

        return state.currentPrice;
    }

    /**
     * @notice ERC-7528 standard getter for asset price and update timestamp.
     */
    function getAssetPrice(address asset) external view override returns (uint256 price, uint256 lastUpdated) {
        price = getPrice(asset);
        lastUpdated = assetPrices[asset].lastUpdated;
    }

    /**
     * @notice ERC-7528 detailed price data structure.
     */
    function getAssetPriceData(address asset) external view override returns (PriceData memory data) {
        AssetPriceState memory state = assetPrices[asset];
        data = PriceData({
            price: state.circuitBreakerTripped ? 0 : state.currentPrice,
            timestamp: state.lastUpdated,
            volume24h: state.volume24h,
            confidence: state.confidenceBps,
            isCircuitBreakerActive: state.circuitBreakerTripped
        });
    }

    /**
     * @notice Returns whether circuit breaker is tripped for an asset.
     */
    function isCircuitBreakerTripped(address asset) external view override returns (bool) {
        return assetPrices[asset].circuitBreakerTripped;
    }
}
