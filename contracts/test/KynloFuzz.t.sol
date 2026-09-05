// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { KynloTestBase } from "./KynloTestBase.sol";
import { KynloVault } from "../src/KynloVault.sol";

contract KynloVaultFuzzTest is KynloTestBase {
    function testFuzzTwoSuccessorClaimsConserveRawUnits(
        uint128 rawAmount,
        uint16 firstShareSeed,
        bool finalClaimsFirst
    ) public {
        uint256 amount = _bound(rawAmount, 1, type(uint96).max);
        uint16 firstShare = uint16(_bound(firstShareSeed, 1, 9_999));
        KynloVault.Successor[] memory list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(SUCCESSOR_A, firstShare);
        list[1] = KynloVault.Successor(SUCCESSOR_B, uint16(10_000 - firstShare));

        vm.prank(OWNER);
        uint256 planId = vault.createLegacyPlan(list, 90 days, 30 days);
        _deposit(planId, stock, amount);
        _acceptAll(planId);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
        _mature(planId);

        uint256 firstAmount = (amount * firstShare) / 10_000;
        uint256 finalAmount = amount - firstAmount;
        if (finalClaimsFirst) {
            vm.prank(SUCCESSOR_B);
            vault.claim(planId, address(stock));
            if (firstAmount != 0) {
                vm.prank(SUCCESSOR_A);
                vault.claim(planId, address(stock));
            }
        } else {
            if (firstAmount != 0) {
                vm.prank(SUCCESSOR_A);
                vault.claim(planId, address(stock));
            }
            vm.prank(SUCCESSOR_B);
            vault.claim(planId, address(stock));
        }

        assertEq(stock.balanceOf(SUCCESSOR_A), firstAmount);
        assertEq(stock.balanceOf(SUCCESSOR_B), finalAmount);
        assertEq(stock.balanceOf(SUCCESSOR_A) + stock.balanceOf(SUCCESSOR_B), amount);
        assertEq(vault.totalAttributed(address(stock)), 0);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.COMPLETED));
    }

    function testFuzzLifecycleBoundaries(uint64 extraInactivity, uint64 extraProtection) public {
        uint64 inactivity = uint64(90 days + _bound(extraInactivity, 0, 3650 days));
        uint64 protection = uint64(30 days + _bound(extraProtection, 0, 3650 days));
        vm.prank(OWNER);
        uint256 planId = vault.createLegacyPlan(_twoSuccessors(), inactivity, protection);
        _deposit(planId, stock, 1);
        _acceptAll(planId);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
        (,, uint64 checkedInAt,,,,,,) = vault.legacyPlans(planId);

        vm.warp(uint256(checkedInAt) + inactivity - 1);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.ACTIVE));
        vm.warp(uint256(checkedInAt) + inactivity);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.PROTECTION));
        vm.warp(uint256(checkedInAt) + inactivity + protection);
        assertEq(
            uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.SUCCESSION_READY)
        );
    }

    function testFuzzWithdrawalNeverExceedsAttributablePosition(
        uint128 depositSeed,
        uint128 withdrawalSeed
    ) public {
        uint256 depositAmount = _bound(depositSeed, 1, type(uint96).max);
        uint256 withdrawalAmount = _bound(withdrawalSeed, 1, depositAmount);
        uint256 planId = _create();
        _deposit(planId, stock, depositAmount);
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), withdrawalAmount);

        KynloVault.AssetPosition[] memory assets = vault.getAssets(planId);
        uint256 expected = depositAmount - withdrawalAmount;
        assertEq(assets[0].remaining, expected);
        assertEq(assets[0].deposited, expected);
        assertEq(vault.totalAttributed(address(stock)), expected);
        assertTrue(stock.balanceOf(address(vault)) >= vault.totalAttributed(address(stock)));
    }
}
