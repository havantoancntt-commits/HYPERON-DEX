// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ERC-7528 On-Chain Price Oracle Interface
/// @notice Standard interface for on-chain DeFi price feeds with staleness, volatility, and volume indicators
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
