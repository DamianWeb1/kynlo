// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice MOCK ASSET for Base Sepolia only. It is not issued or endorsed by Coinbase.
contract MockB20PolicyAsset is ERC20, Ownable {
    mapping(address account => bool blocked) public policyBlocked;

    error MockPolicyBlocked(address account);

    event MockPolicySet(address indexed account, bool blocked);

    constructor(address policyAdmin, address initialHolder, uint256 initialRawAmount)
        ERC20("Kynlo Mock B20 Stock", "MOCK-B20")
        Ownable(policyAdmin)
    {
        if (initialHolder == address(0)) revert ERC20InvalidReceiver(address(0));
        _mint(initialHolder, initialRawAmount);
    }

    function setPolicyBlocked(address account, bool blocked) external onlyOwner {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));
        policyBlocked[account] = blocked;
        emit MockPolicySet(account, blocked);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && policyBlocked[from]) revert MockPolicyBlocked(from);
        if (to != address(0) && policyBlocked[to]) revert MockPolicyBlocked(to);
        super._update(from, to, value);
    }
}
