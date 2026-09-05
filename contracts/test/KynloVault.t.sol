// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {KynloTestBase} from "./KynloTestBase.sol";
import {KynloVault} from "../src/KynloVault.sol";
import {KynloAssetRegistry} from "../src/KynloAssetRegistry.sol";
import {MockPolicyToken} from "./mocks/MockPolicyToken.sol";
import {MockFeeToken} from "./mocks/MockFeeToken.sol";
import {MockReentrantToken} from "./mocks/MockReentrantToken.sol";

contract KynloVaultCreationTest is KynloTestBase {
    function testCreatesValidPlanInDraft() public {
        uint256 planId = _create();
        (
            address planOwner,
            uint64 createdAt,
            uint64 lastCheckIn,
            uint64 inactivity,
            uint64 protection,
            uint32 version,
            bool armed,
            bool cancelled,
            bool completed
        ) = vault.legacyPlans(planId);

        createdAt;
        lastCheckIn;
        cancelled;
        completed;
        assertEq(planOwner, OWNER);
        assertEq(inactivity, 90 days);
        assertEq(protection, 30 days);
        assertEq(version, 1);
        assertFalse(armed);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.DRAFT));
    }

    function testRejectsZeroSuccessors() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](0);
        vm.expectRevert(KynloVault.InvalidSuccessorCount.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsMoreThanThreeSuccessors() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](4);
        list[0] = KynloVault.Successor(address(1), 2_500);
        list[1] = KynloVault.Successor(address(2), 2_500);
        list[2] = KynloVault.Successor(address(3), 2_500);
        list[3] = KynloVault.Successor(address(4), 2_500);
        vm.expectRevert(KynloVault.InvalidSuccessorCount.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsZeroSuccessorAddress() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](1);
        list[0] = KynloVault.Successor(address(0), 10_000);
        vm.expectRevert(KynloVault.InvalidSuccessor.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsOwnerAsSuccessor() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](1);
        list[0] = KynloVault.Successor(OWNER, 10_000);
        vm.expectRevert(KynloVault.InvalidSuccessor.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsDuplicateSuccessors() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(SUCCESSOR_A, 5_000);
        list[1] = KynloVault.Successor(SUCCESSOR_A, 5_000);
        vm.expectRevert(KynloVault.DuplicateSuccessor.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsZeroShare() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(SUCCESSOR_A, 0);
        list[1] = KynloVault.Successor(SUCCESSOR_B, 10_000);
        vm.expectRevert(KynloVault.InvalidSuccessor.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testRejectsAllocationNotEqualToTenThousandBps() public {
        KynloVault.Successor[] memory list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(SUCCESSOR_A, 5_000);
        list[1] = KynloVault.Successor(SUCCESSOR_B, 4_999);
        vm.expectRevert(KynloVault.InvalidAllocation.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function testProductionMinimumsCannotBeWeakened() public {
        vm.expectRevert(KynloVault.UnsafeTiming.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(_twoSuccessors(), 89 days, 30 days);

        vm.expectRevert(KynloVault.UnsafeTiming.selector);
        vm.prank(OWNER);
        vault.createLegacyPlan(_twoSuccessors(), 90 days, 29 days);
    }

    function testGettersReturnSuccessorsAndAssets() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        KynloVault.Successor[] memory successors = vault.getSuccessors(planId);
        KynloVault.AssetPosition[] memory assets = vault.getAssets(planId);
        assertEq(successors.length, 2);
        assertEq(successors[0].account, SUCCESSOR_A);
        assertEq(successors[0].shareBps, 6_000);
        assertEq(assets.length, 1);
        assertEq(assets[0].token, address(stock));
        assertEq(assets[0].remaining, 100);
    }
}

contract KynloAssetRegistryTest is KynloTestBase {
    function testOnlyRegistryOwnerCanChangeAdmission() public {
        vm.expectRevert();
        vm.prank(STRANGER);
        registry.setSupportedStock(address(stock), false);
        assertTrue(registry.isSupportedStock(address(stock)));
    }

    function testRegistryRejectsNonContractAsset() public {
        vm.expectRevert(KynloAssetRegistry.InvalidToken.selector);
        registry.setSupportedStock(address(0x1234), true);
    }

    function testRegistryOwnerCanPauseAndResumeNewDeposits() public {
        registry.setNewDepositsPaused(true);
        assertTrue(registry.newDepositsPaused());
        registry.setNewDepositsPaused(false);
        assertFalse(registry.newDepositsPaused());
    }
}

contract KynloVaultAcceptanceTest is KynloTestBase {
    function testExactSuccessorWalletCanAccept() public {
        uint256 planId = _create();
        vm.prank(SUCCESSOR_A);
        vault.acceptSuccessor(planId);
        assertEq(vault.acceptedVersion(planId, SUCCESSOR_A), 1);
    }

    function testStrangerCannotAccept() public {
        uint256 planId = _create();
        vm.expectRevert(KynloVault.SuccessorNotListed.selector);
        vm.prank(STRANGER);
        vault.acceptSuccessor(planId);
    }

    function testDuplicateAcceptanceRejected() public {
        uint256 planId = _create();
        vm.prank(SUCCESSOR_A);
        vault.acceptSuccessor(planId);
        vm.expectRevert(KynloVault.AlreadyAccepted.selector);
        vm.prank(SUCCESSOR_A);
        vault.acceptSuccessor(planId);
    }

    function testArmRequiresAllAcceptance() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        vm.prank(SUCCESSOR_A);
        vault.acceptSuccessor(planId);
        vm.expectRevert(KynloVault.AcceptancesIncomplete.selector);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
    }

    function testArmRequiresAssets() public {
        uint256 planId = _create();
        _acceptAll(planId);
        vm.expectRevert(KynloVault.NoAssets.selector);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
    }

    function testArmRejectsAnEmptiedPosition() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 100);
        _acceptAll(planId);
        vm.expectRevert(KynloVault.NoAssets.selector);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
    }

    function testSuccessorUpdateInvalidatesEveryAcceptanceAndReturnsDraft() public {
        uint256 planId = _activePlan(100);
        KynloVault.Successor[] memory next = new KynloVault.Successor[](2);
        next[0] = KynloVault.Successor(SUCCESSOR_A, 5_000);
        next[1] = KynloVault.Successor(SUCCESSOR_C, 5_000);
        vm.prank(OWNER);
        vault.updateSuccessors(planId, next);

        assertFalse(vault.isFullyAccepted(planId));
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.DRAFT));
        (, , uint64 lastCheckIn, , , uint32 version, bool armed, , ) = vault.legacyPlans(planId);
        assertEq(version, 2);
        assertEq(lastCheckIn, 0);
        assertFalse(armed);
        assertTrue(vault.acceptedVersion(planId, SUCCESSOR_A) != version);
    }

    function testAllocationOnlyUpdateAlsoInvalidatesEveryAcceptance() public {
        uint256 planId = _activePlan(100);
        KynloVault.Successor[] memory next = new KynloVault.Successor[](2);
        next[0] = KynloVault.Successor(SUCCESSOR_A, 7_000);
        next[1] = KynloVault.Successor(SUCCESSOR_B, 3_000);
        vm.prank(OWNER);
        vault.updateSuccessors(planId, next);

        assertFalse(vault.isFullyAccepted(planId));
        (, , , , , uint32 version, , , ) = vault.legacyPlans(planId);
        assertEq(version, 2);
        assertTrue(vault.acceptedVersion(planId, SUCCESSOR_A) != version);
        assertTrue(vault.acceptedVersion(planId, SUCCESSOR_B) != version);
    }
}

contract KynloVaultLifecycleTest is KynloTestBase {
    function testActiveStateAfterArm() public {
        uint256 planId = _activePlan(100);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.ACTIVE));
    }

    function testExactDeadlineStartsProtection() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, , , , , ) = vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity - 1);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.ACTIVE));
        vm.warp(uint256(lastCheckIn) + inactivity);
        assertEq(
            uint256(vault.getEffectiveState(planId)),
            uint256(KynloVault.PlanState.PROTECTION)
        );
    }

    function testExactProtectionBoundaryStartsSuccessionReady() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, uint64 protection, , , , ) =
            vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity + protection - 1);
        assertEq(
            uint256(vault.getEffectiveState(planId)),
            uint256(KynloVault.PlanState.PROTECTION)
        );
        vm.warp(uint256(lastCheckIn) + inactivity + protection);
        assertEq(
            uint256(vault.getEffectiveState(planId)),
            uint256(KynloVault.PlanState.SUCCESSION_READY)
        );
    }

    function testProofOfLifeRecoversDuringProtection() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, , , , , ) = vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity);
        vm.prank(OWNER);
        vault.checkIn(planId);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.ACTIVE));
    }

    function testProtectionFreezesSuccessorsAndTiming() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, , , , , ) = vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity);

        vm.expectRevert(KynloVault.ProtectedMutation.selector);
        vm.prank(OWNER);
        vault.updateSuccessors(planId, _twoSuccessors());

        vm.expectRevert(KynloVault.ProtectedMutation.selector);
        vm.prank(OWNER);
        vault.updateTiming(planId, 91 days, 31 days);
    }

    function testActiveTimingUpdateStillEnforcesProductionMinimums() public {
        uint256 planId = _activePlan(100);
        vm.expectRevert(KynloVault.UnsafeTiming.selector);
        vm.prank(OWNER);
        vault.updateTiming(planId, 89 days, 30 days);
        vm.expectRevert(KynloVault.UnsafeTiming.selector);
        vm.prank(OWNER);
        vault.updateTiming(planId, 90 days, 29 days);
    }

    function testProtectionRequiresRecoveryBeforeWithdrawal() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, , , , , ) = vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity);
        vm.expectRevert(KynloVault.ProtectedMutation.selector);
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 1);
    }

    function testMatureStateForbidsOwnerMutations() public {
        uint256 planId = _activePlan(100);
        _mature(planId);

        vm.expectRevert();
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 1);
        vm.expectRevert();
        vm.prank(OWNER);
        vault.cancelLegacyPlan(planId);
        vm.expectRevert(KynloVault.ProtectedMutation.selector);
        vm.prank(OWNER);
        vault.updateSuccessors(planId, _twoSuccessors());
        vm.expectRevert(KynloVault.ProtectedMutation.selector);
        vm.prank(OWNER);
        vault.updateTiming(planId, 91 days, 31 days);
    }

    function testLifecycleIsDeterministicWhenTimeMovesBackward() public {
        uint256 planId = _activePlan(100);
        (, , uint64 lastCheckIn, uint64 inactivity, uint64 protection, , , , ) =
            vault.legacyPlans(planId);
        vm.warp(uint256(lastCheckIn) + inactivity + protection);
        assertEq(
            uint256(vault.getEffectiveState(planId)),
            uint256(KynloVault.PlanState.SUCCESSION_READY)
        );
        vm.warp(uint256(lastCheckIn) + 1);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.ACTIVE));
    }
}

contract KynloVaultAssetTest is KynloTestBase {
    function testSupportedDepositTracksRawUnits() public {
        uint256 planId = _create();
        _deposit(planId, stock, 123);
        assertEq(stock.balanceOf(address(vault)), 123);
        assertEq(vault.totalAttributed(address(stock)), 123);
    }

    function testUnsupportedDepositRejected() public {
        MockPolicyToken unsupported = new MockPolicyToken("Unsupported", "NO");
        unsupported.mint(OWNER, 100);
        uint256 planId = _create();
        vm.startPrank(OWNER);
        unsupported.approve(address(vault), 100);
        vm.expectRevert(KynloVault.UnsupportedStock.selector);
        vault.depositAsset(planId, address(unsupported), 100);
        vm.stopPrank();
    }

    function testWithdrawalUpdatesPositionAndAttribution() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 40);
        KynloVault.AssetPosition[] memory assets = vault.getAssets(planId);
        assertEq(assets[0].deposited, 60);
        assertEq(assets[0].remaining, 60);
        assertEq(vault.totalAttributed(address(stock)), 60);
    }

    function testCancellationReturnsMultipleAssets() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        _deposit(planId, secondStock, 75);
        vm.prank(OWNER);
        vault.cancelLegacyPlan(planId);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.CANCELLED));
        assertEq(vault.totalAttributed(address(stock)), 0);
        assertEq(vault.totalAttributed(address(secondStock)), 0);
        assertEq(stock.balanceOf(address(vault)), 0);
        assertEq(secondStock.balanceOf(address(vault)), 0);
    }

    function testRegistryDisableBlocksFutureDepositAndPreservesWithdrawal() public {
        uint256 planId = _activePlan(100);
        registry.setSupportedStock(address(stock), false);
        vm.startPrank(OWNER);
        stock.approve(address(vault), 1);
        vm.expectRevert(KynloVault.UnsupportedStock.selector);
        vault.depositAsset(planId, address(stock), 1);
        vm.stopPrank();
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 100);
        assertEq(vault.totalAttributed(address(stock)), 0);
    }

    function testDepositPausePreservesWithdrawal() public {
        uint256 planId = _activePlan(100);
        registry.setNewDepositsPaused(true);
        vm.prank(OWNER);
        vault.withdrawAsset(planId, address(stock), 100);
        assertEq(vault.totalAttributed(address(stock)), 0);
    }

    function testDepositPauseRejectsOnlyNewDeposits() public {
        uint256 planId = _create();
        registry.setNewDepositsPaused(true);
        vm.startPrank(OWNER);
        stock.approve(address(vault), 1);
        vm.expectRevert(KynloVault.DepositsPaused.selector);
        vault.depositAsset(planId, address(stock), 1);
        vm.stopPrank();
    }

}

contract KynloVaultTokenFailureTest is KynloTestBase {
    function testFailedDepositTransferFromLeavesNoPositionOrAttribution() public {
        uint256 planId = _create();
        stock.setBlockedReceiver(address(vault), true);
        vm.startPrank(OWNER);
        stock.approve(address(vault), 100);
        vm.expectRevert();
        vault.depositAsset(planId, address(stock), 100);
        vm.stopPrank();

        assertEq(stock.balanceOf(address(vault)), 0);
        assertEq(vault.totalAttributed(address(stock)), 0);
        assertEq(vault.getAssets(planId).length, 0);
    }

    function testFeeOnTransferDepositRejectedWithoutAccountingDrift() public {
        MockFeeToken feeToken = new MockFeeToken();
        feeToken.mint(OWNER, 100);
        registry.setSupportedStock(address(feeToken), true);
        uint256 planId = _create();
        vm.startPrank(OWNER);
        feeToken.approve(address(vault), 100);
        vm.expectRevert(KynloVault.UnsupportedTransferBehavior.selector);
        vault.depositAsset(planId, address(feeToken), 100);
        vm.stopPrank();
        assertEq(feeToken.balanceOf(address(vault)), 0);
        assertEq(vault.totalAttributed(address(feeToken)), 0);
    }
}

contract KynloVaultAuthorityTest is KynloTestBase {
    function testRegistryAdminCannotMoveUserAssets() public {
        uint256 planId = _create();
        _deposit(planId, stock, 100);
        vm.expectRevert(KynloVault.NotPlanOwner.selector);
        vault.withdrawAsset(planId, address(stock), 100);
        assertEq(stock.balanceOf(address(vault)), 100);

        (bool success, ) = address(vault).call(
            abi.encodeWithSignature("sweep(address)", address(stock))
        );
        assertFalse(success);
        assertEq(stock.balanceOf(address(vault)), 100);
    }

    function testTokenReentrancyAttemptRevertsWithoutAccountingChange() public {
        MockReentrantToken reentrantToken = new MockReentrantToken();
        reentrantToken.mint(OWNER, 100);
        registry.setSupportedStock(address(reentrantToken), true);
        uint256 planId = _create();
        reentrantToken.configureAttack(address(vault), planId);

        vm.startPrank(OWNER);
        reentrantToken.approve(address(vault), 100);
        vm.expectRevert(bytes4(keccak256("ReentrancyGuardReentrantCall()")));
        vault.depositAsset(planId, address(reentrantToken), 100);
        vm.stopPrank();

        assertEq(reentrantToken.balanceOf(address(vault)), 0);
        assertEq(vault.totalAttributed(address(reentrantToken)), 0);
        assertEq(vault.getAssets(planId).length, 0);
    }
}

contract KynloVaultClaimsTest is KynloTestBase {
    function testClaimsUseDeterministicFloorAndFinalResidual() public {
        uint256 planId = _activePlan(101);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        vm.prank(SUCCESSOR_B);
        vault.claim(planId, address(stock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
        assertEq(stock.balanceOf(SUCCESSOR_B), 41);
        assertEq(uint256(vault.getEffectiveState(planId)), uint256(KynloVault.PlanState.COMPLETED));
    }

    function testFinalSuccessorCanClaimFirstWithoutChangingAllocation() public {
        uint256 planId = _activePlan(101);
        _mature(planId);
        vm.prank(SUCCESSOR_B);
        vault.claim(planId, address(stock));
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
        assertEq(stock.balanceOf(SUCCESSOR_B), 41);
    }

    function testMultipleAssetsClaimIndependently() public {
        uint256 planId = _activePlan(101);
        _deposit(planId, secondStock, 203);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(secondStock));
        vm.prank(SUCCESSOR_B);
        vault.claim(planId, address(stock));
        assertEq(
            uint256(vault.getEffectiveState(planId)),
            uint256(KynloVault.PlanState.SUCCESSION_READY)
        );
        vm.prank(SUCCESSOR_B);
        vault.claim(planId, address(secondStock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
        assertEq(stock.balanceOf(SUCCESSOR_B), 41);
        assertEq(secondStock.balanceOf(SUCCESSOR_A), 121);
        assertEq(secondStock.balanceOf(SUCCESSOR_B), 82);
    }

    function testDuplicateClaimRejected() public {
        uint256 planId = _activePlan(100);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        vm.expectRevert(KynloVault.AlreadyClaimed.selector);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
    }

    function testPrematureClaimRejected() public {
        uint256 planId = _activePlan(100);
        vm.expectRevert(KynloVault.ClaimUnavailable.selector);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
    }

    function testFailedPolicyTransferPreservesClaimAndDistributionBase() public {
        uint256 planId = _activePlan(100);
        _mature(planId);
        stock.setBlockedReceiver(SUCCESSOR_A, true);
        vm.expectRevert();
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        assertFalse(vault.claimed(planId, SUCCESSOR_A, address(stock)));
        KynloVault.AssetPosition[] memory assets = vault.getAssets(planId);
        assertEq(assets[0].remaining, 100);
        assertEq(assets[0].distributionBase, 0);
        assertEq(vault.totalAttributed(address(stock)), 100);
    }

    function testRegistryDisablePreservesClaims() public {
        uint256 planId = _activePlan(100);
        registry.setSupportedStock(address(stock), false);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
    }

    function testDepositPausePreservesClaims() public {
        uint256 planId = _activePlan(100);
        registry.setNewDepositsPaused(true);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
    }

    function testLiveVaultBalanceDoesNotIncreaseEntitlement() public {
        uint256 planId = _activePlan(100);
        stock.mint(address(vault), 900);
        _mature(planId);
        vm.prank(SUCCESSOR_A);
        vault.claim(planId, address(stock));
        assertEq(stock.balanceOf(SUCCESSOR_A), 60);
        assertEq(vault.totalAttributed(address(stock)), 40);
        assertEq(stock.balanceOf(address(vault)), 940);
    }
}
