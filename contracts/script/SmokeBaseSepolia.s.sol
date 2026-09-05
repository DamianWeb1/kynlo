// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";
import { KynloVault } from "../src/KynloVault.sol";

/// @notice Runs the live, non-mature portion of the lifecycle with three staging wallets.
contract SmokeBaseSepolia is BaseSepoliaScript {
    struct SmokeConfig {
        address registry;
        address vault;
        address mockAsset;
        uint256 ownerKey;
        address owner;
        uint256 successorAKey;
        address successorA;
        uint256 successorBKey;
        address successorB;
        uint256 rawAmount;
    }

    error AddressHasNoCode(address account);
    error InvalidDeployment();
    error SmokeAssertionFailed();

    function run() external returns (uint256 planId) {
        _requireBaseSepolia();
        SmokeConfig memory config;
        config.registry = _requiredAddress("BASE_SEPOLIA_REGISTRY_ADDRESS");
        config.vault = _requiredAddress("BASE_SEPOLIA_VAULT_ADDRESS");
        config.mockAsset = _requiredAddress("BASE_SEPOLIA_MOCK_ASSET_ADDRESS");
        if (config.registry.code.length == 0) revert AddressHasNoCode(config.registry);
        if (config.vault.code.length == 0) revert AddressHasNoCode(config.vault);
        if (config.mockAsset.code.length == 0) revert AddressHasNoCode(config.mockAsset);

        (config.ownerKey, config.owner) =
            _validatedKey("BASE_SEPOLIA_OWNER_PRIVATE_KEY", "BASE_SEPOLIA_OWNER_ADDRESS");
        (config.successorAKey, config.successorA) = _validatedKey(
            "BASE_SEPOLIA_SUCCESSOR_A_PRIVATE_KEY", "BASE_SEPOLIA_SUCCESSOR_A_ADDRESS"
        );
        (config.successorBKey, config.successorB) = _validatedKey(
            "BASE_SEPOLIA_SUCCESSOR_B_PRIVATE_KEY", "BASE_SEPOLIA_SUCCESSOR_B_ADDRESS"
        );
        config.rawAmount = vm.envUint("BASE_SEPOLIA_SMOKE_RAW_AMOUNT");
        if (config.rawAmount == 0) revert InvalidAmount("BASE_SEPOLIA_SMOKE_RAW_AMOUNT");

        KynloVault vault = KynloVault(config.vault);
        if (address(vault.assetRegistry()) != config.registry) revert InvalidDeployment();
        KynloAssetRegistry registry = KynloAssetRegistry(config.registry);
        if (!registry.isSupportedStock(config.mockAsset) || registry.newDepositsPaused()) {
            revert InvalidDeployment();
        }

        KynloVault.Successor[] memory successors = new KynloVault.Successor[](2);
        successors[0] = KynloVault.Successor(config.successorA, 6_000);
        successors[1] = KynloVault.Successor(config.successorB, 4_000);

        vm.startBroadcast(config.ownerKey);
        planId = vault.createLegacyPlan(successors, 90 days, 30 days);
        IERC20(config.mockAsset).approve(config.vault, config.rawAmount);
        vault.depositAsset(planId, config.mockAsset, config.rawAmount);
        vm.stopBroadcast();

        vm.startBroadcast(config.successorAKey);
        vault.acceptSuccessor(planId);
        vm.stopBroadcast();

        vm.startBroadcast(config.successorBKey);
        vault.acceptSuccessor(planId);
        vm.stopBroadcast();

        vm.startBroadcast(config.ownerKey);
        vault.armLegacyPlan(planId);
        vault.checkIn(planId);
        vm.stopBroadcast();

        if (vault.getEffectiveState(planId) != KynloVault.PlanState.ACTIVE) {
            revert SmokeAssertionFailed();
        }
        if (vault.totalAttributed(config.mockAsset) != config.rawAmount) {
            revert SmokeAssertionFailed();
        }
        (address planOwner,,,,,,,,) = vault.legacyPlans(planId);
        if (planOwner != config.owner || !vault.isFullyAccepted(planId)) {
            revert SmokeAssertionFailed();
        }
        KynloVault.AssetPosition[] memory assets = vault.getAssets(planId);
        if (assets.length != 1 || assets[0].remaining != config.rawAmount) {
            revert SmokeAssertionFailed();
        }
    }
}
