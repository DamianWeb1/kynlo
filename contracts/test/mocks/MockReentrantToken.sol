// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IKynloVaultReentryTarget {
    function depositAsset(uint256 planId, address token, uint256 rawAmount) external;
}

contract MockReentrantToken is ERC20 {
    IKynloVaultReentryTarget public target;
    uint256 public targetPlanId;
    bool public attackEnabled;

    constructor() ERC20("Reentrant Token", "REENTER") { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function configureAttack(address target_, uint256 planId_) external {
        target = IKynloVaultReentryTarget(target_);
        targetPlanId = planId_;
        attackEnabled = true;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (attackEnabled && from != address(0) && to == address(target)) {
            target.depositAsset(targetPlanId, address(this), 1);
        }
        super._update(from, to, value);
    }
}
