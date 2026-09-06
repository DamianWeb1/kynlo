// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";
import { KynloVault } from "../src/KynloVault.sol";
import { MockB20PolicyAsset } from "../staging/MockB20PolicyAsset.sol";
import { MockReentrantToken } from "../test/mocks/MockReentrantToken.sol";

/// @notice Exercises the deployed contracts on a Base Sepolia fork without broadcasting or
/// weakening the production lifecycle constants.
contract ForkLifecycleBaseSepolia is BaseSepoliaScript {
    address internal constant STRANGER = address(0xBAD);

    struct ForkConfig {
        KynloAssetRegistry registry;
        KynloVault vault;
        MockB20PolicyAsset asset;
        address registryAdmin;
        address policyAdmin;
        address owner;
        address successorA;
        address successorB;
        uint256 rawAmount;
    }

    error AddressHasNoCode(address account);
    error ForkAssertionFailed(string assertion);

    function run() external {
        _requireBaseSepolia();
        ForkConfig memory config = _config();
        _testPauseAndRegistryExits(config);
        _testReentrancy(config);
        _testLifecycleAndClaims(config);
    }

    function _config() internal returns (ForkConfig memory config) {
        config.registry = KynloAssetRegistry(_requiredAddress("BASE_SEPOLIA_REGISTRY_ADDRESS"));
        config.vault = KynloVault(_requiredAddress("BASE_SEPOLIA_VAULT_ADDRESS"));
        config.asset = MockB20PolicyAsset(_requiredAddress("BASE_SEPOLIA_MOCK_ASSET_ADDRESS"));
        config.registryAdmin = _requiredAddress("BASE_SEPOLIA_REGISTRY_ADMIN");
        config.policyAdmin = _requiredAddress("BASE_SEPOLIA_MOCK_POLICY_ADMIN");
        config.owner = _requiredAddress("BASE_SEPOLIA_OWNER_ADDRESS");
        config.successorA = _requiredAddress("BASE_SEPOLIA_SUCCESSOR_A_ADDRESS");
        config.successorB = _requiredAddress("BASE_SEPOLIA_SUCCESSOR_B_ADDRESS");
        config.rawAmount = vm.envUint("BASE_SEPOLIA_FORK_RAW_AMOUNT");

        if (address(config.registry).code.length == 0) {
            revert AddressHasNoCode(address(config.registry));
        }
        if (address(config.vault).code.length == 0) {
            revert AddressHasNoCode(address(config.vault));
        }
        if (address(config.asset).code.length == 0) {
            revert AddressHasNoCode(address(config.asset));
        }
        _assert(
            address(config.vault.assetRegistry()) == address(config.registry), "registry wiring"
        );
        _assert(config.registry.owner() == config.registryAdmin, "registry admin");
        _assert(config.asset.owner() == config.policyAdmin, "policy admin");
        _assert(config.rawAmount >= 10_001, "fork raw amount");
        _assert(
            config.asset.balanceOf(config.owner) >= config.rawAmount + 202, "owner mock balance"
        );
    }

    function _testPauseAndRegistryExits(ForkConfig memory config) internal {
        uint256 planId = _createPlan(config, 6_000, 4_000);

        vm.startPrank(config.owner);
        config.asset.approve(address(config.vault), 200);
        config.vault.depositAsset(planId, address(config.asset), 200);
        vm.stopPrank();

        vm.prank(config.registryAdmin);
        config.registry.setNewDepositsPaused(true);

        vm.startPrank(config.owner);
        (bool pausedDeposit,) = address(config.vault)
            .call(abi.encodeCall(KynloVault.depositAsset, (planId, address(config.asset), 1)));
        _assert(!pausedDeposit, "paused deposit rejected");
        config.vault.withdrawAsset(planId, address(config.asset), 80);
        vm.stopPrank();

        vm.startPrank(config.registryAdmin);
        config.registry.setNewDepositsPaused(false);
        config.registry.setSupportedStock(address(config.asset), false);
        vm.stopPrank();

        vm.startPrank(config.owner);
        (bool disabledDeposit,) = address(config.vault)
            .call(abi.encodeCall(KynloVault.depositAsset, (planId, address(config.asset), 1)));
        _assert(!disabledDeposit, "disabled deposit rejected");
        config.vault.withdrawAsset(planId, address(config.asset), 120);
        vm.stopPrank();

        vm.prank(config.registryAdmin);
        config.registry.setSupportedStock(address(config.asset), true);

        KynloVault.AssetPosition[] memory assets = config.vault.getAssets(planId);
        _assert(assets[0].remaining == 0, "disabled asset remains withdrawable");
    }

    function _testReentrancy(ForkConfig memory config) internal {
        MockReentrantToken reentrant = new MockReentrantToken();
        reentrant.mint(config.owner, 10);

        vm.prank(config.registryAdmin);
        config.registry.setSupportedStock(address(reentrant), true);

        uint256 planId = _createPlan(config, 6_000, 4_000);
        vm.startPrank(config.owner);
        reentrant.approve(address(config.vault), 10);
        reentrant.configureAttack(address(config.vault), planId);
        (bool deposited,) = address(config.vault)
            .call(abi.encodeCall(KynloVault.depositAsset, (planId, address(reentrant), 10)));
        vm.stopPrank();

        _assert(!deposited, "reentrant deposit rejected");
        _assert(config.vault.totalAttributed(address(reentrant)) == 0, "reentrant attribution");
        _assert(reentrant.balanceOf(address(config.vault)) == 0, "reentrant balance");
    }

    function _testLifecycleAndClaims(ForkConfig memory config) internal {
        uint256 attributedBefore = config.vault.totalAttributed(address(config.asset));
        uint256 planId = _createPlan(config, 6_000, 4_000);

        vm.startPrank(config.owner);
        config.asset.approve(address(config.vault), config.rawAmount);
        config.vault.depositAsset(planId, address(config.asset), config.rawAmount);
        vm.stopPrank();

        KynloVault.Successor[] memory revised = _successors(config, 5_000, 5_000);
        vm.prank(config.owner);
        config.vault.updateSuccessors(planId, revised);
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.DRAFT,
            "successor update returns draft"
        );

        vm.startPrank(config.owner);
        config.vault.armLegacyPlan(planId);
        config.vault.checkIn(planId);
        vm.stopPrank();
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.ACTIVE, "active state"
        );

        uint256 attributedAfterDeposit = config.vault.totalAttributed(address(config.asset));
        vm.prank(config.owner);
        bool directTransfer = config.asset.transfer(address(config.vault), 1);
        _assert(directTransfer, "direct transfer");
        _assert(
            config.vault.totalAttributed(address(config.asset)) == attributedAfterDeposit,
            "direct transfer attribution"
        );

        uint64 checkInAt = _lastCheckIn(config.vault, planId);
        vm.warp(uint256(checkInAt) + 90 days);
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.PROTECTION,
            "exact protection boundary"
        );

        vm.prank(config.owner);
        config.vault.checkIn(planId);
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.ACTIVE,
            "protection recovery"
        );

        checkInAt = _lastCheckIn(config.vault, planId);
        vm.warp(uint256(checkInAt) + 90 days);
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.PROTECTION,
            "second protection"
        );

        vm.startPrank(config.registryAdmin);
        config.registry.setNewDepositsPaused(true);
        config.registry.setSupportedStock(address(config.asset), false);
        vm.stopPrank();

        vm.warp(uint256(checkInAt) + 90 days + 30 days);
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.SUCCESSION_READY,
            "exact succession boundary"
        );

        _testMatureClaims(config, planId, attributedBefore);
    }

    function _testMatureClaims(ForkConfig memory config, uint256 planId, uint256 attributedBefore)
        internal
    {
        vm.prank(config.owner);
        (bool matureMutation,) = address(config.vault)
            .call(
                abi.encodeCall(KynloVault.updateTiming, (planId, uint64(91 days), uint64(31 days)))
            );
        _assert(!matureMutation, "mature mutation rejected");

        vm.prank(config.policyAdmin);
        config.asset.setPolicyBlocked(config.successorA, true);
        vm.prank(config.successorA);
        (bool blockedClaim,) = address(config.vault)
            .call(abi.encodeCall(KynloVault.claim, (planId, address(config.asset))));
        _assert(!blockedClaim, "policy claim rejected");
        _assert(
            !config.vault.claimed(planId, config.successorA, address(config.asset)),
            "failed claim entitlement preserved"
        );

        vm.prank(config.policyAdmin);
        config.asset.setPolicyBlocked(config.successorA, false);

        uint256 successorABefore = config.asset.balanceOf(config.successorA);
        uint256 successorBBefore = config.asset.balanceOf(config.successorB);
        vm.prank(config.successorB);
        config.vault.claim(planId, address(config.asset));
        vm.prank(config.successorA);
        config.vault.claim(planId, address(config.asset));

        _assert(
            config.asset.balanceOf(config.successorA) - successorABefore
                == config.rawAmount * 5_000 / 10_000,
            "first successor floor"
        );
        _assert(
            config.asset.balanceOf(config.successorB) - successorBBefore
                == config.rawAmount - (config.rawAmount * 5_000 / 10_000),
            "final successor residual"
        );
        _assert(
            config.vault.totalAttributed(address(config.asset)) == attributedBefore,
            "attributable accounting restored"
        );
        _assert(
            config.vault.getEffectiveState(planId) == KynloVault.PlanState.COMPLETED,
            "completed state"
        );
    }

    function _createPlan(ForkConfig memory config, uint16 shareA, uint16 shareB)
        internal
        returns (uint256 planId)
    {
        KynloVault.Successor[] memory list = _successors(config, shareA, shareB);
        vm.prank(config.owner);
        planId = config.vault.createLegacyPlan(list, 90 days, 30 days);
    }

    function _successors(ForkConfig memory config, uint16 shareA, uint16 shareB)
        internal
        pure
        returns (KynloVault.Successor[] memory list)
    {
        list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(config.successorA, shareA);
        list[1] = KynloVault.Successor(config.successorB, shareB);
    }

    function _lastCheckIn(KynloVault vault, uint256 planId) internal view returns (uint64 value) {
        (,, value,,,,,,) = vault.legacyPlans(planId);
    }

    function _assert(bool condition, string memory assertion) internal pure {
        if (!condition) revert ForkAssertionFailed(assertion);
    }
}
