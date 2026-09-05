// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";
import { KynloVault } from "../src/KynloVault.sol";

/// @notice Deploys the production Kynlo contracts to Base Sepolia without changing production rules.
contract DeployBaseSepolia is BaseSepoliaScript {
    error RegistryOwnerMismatch(address expected, address actual);
    error RegistryWiringMismatch(address expected, address actual);

    function run() external returns (KynloAssetRegistry registry, KynloVault vault) {
        _requireBaseSepolia();
        (uint256 deployerKey,) =
            _validatedKey("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY", "BASE_SEPOLIA_DEPLOYER_ADDRESS");
        address registryAdmin = _requiredAddress("BASE_SEPOLIA_REGISTRY_ADMIN");

        vm.startBroadcast(deployerKey);
        registry = new KynloAssetRegistry(registryAdmin);
        vault = new KynloVault(address(registry));
        vm.stopBroadcast();

        if (registry.owner() != registryAdmin) {
            revert RegistryOwnerMismatch(registryAdmin, registry.owner());
        }
        if (address(vault.assetRegistry()) != address(registry)) {
            revert RegistryWiringMismatch(address(registry), address(vault.assetRegistry()));
        }
    }
}
