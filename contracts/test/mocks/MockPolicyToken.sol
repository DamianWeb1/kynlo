// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPolicyToken is ERC20 {
    mapping(address => bool) public blockedReceiver;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlockedReceiver(address account, bool blocked) external {
        blockedReceiver[account] = blocked;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (to != address(0)) require(!blockedReceiver[to], "ISSUER_POLICY");
        super._update(from, to, value);
    }
}
