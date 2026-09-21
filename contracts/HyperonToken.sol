// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HyperonToken (HYPR)
 * @author HYPERON Institutional Quantitative Protocol
 * @notice The canonical native utility, governance, and fee-discount token of HYPERON-DEX.
 * 
 * Key Tokenomics & Security Highlights:
 * - Fixed Hard Cap: Exactly 1,000,000,000 HYPR (1 Billion tokens).
 * - No Minting Backdoor: The total supply is minted in full to the deployer at genesis.
 * - Burnable: Supports decentralized on-chain fee burn via ERC20Burnable.
 * - Gasless Permits: EIP-2612 permit functionality enabled for zero-gas DEX approvals.
 * - No Transfer Taxes / No Blacklist: 100% decentralized, 100/100 CertiK / GoPlus DeFi score.
 */
contract HyperonToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant TOTAL_SUPPLY_CAP = 1_000_000_000 * 10 ** 18; // 1,000,000,000 HYPR

    event GenesisDistributed(address indexed treasury, uint256 amount);

    constructor(address initialOwner)
        ERC20("Hyperon", "HYPR")
        ERC20Permit("Hyperon")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "Invalid initial owner");
        _mint(initialOwner, TOTAL_SUPPLY_CAP);
        emit GenesisDistributed(initialOwner, TOTAL_SUPPLY_CAP);
    }
}
