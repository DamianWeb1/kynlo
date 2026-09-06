// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";
import { KynloVault } from "../src/KynloVault.sol";
import { MockB20PolicyAsset } from "../staging/MockB20PolicyAsset.sol";

/// @notice Deploys and configures the complete Base Sepolia staging stack in one script.
/// @dev Keeping deployer transactions in one broadcast avoids cross-script nonce drift on public RPCs.
contract DeployBaseSepoliaStaging is BaseSepoliaScript {
    error RegistryOwnerMismatch(address expected, address actual);
    error RegistryWiringMismatch(address expected, address actual);
    error MockAdmissionFailed(address mockAsset);

    function run()
        external
        returns (KynloAssetRegistry registry, KynloVault vault, MockB20PolicyAsset mockAsset)
    {
        _requireBaseSepolia();
        (uint256 deployerKey, address deployer) =
            _validatedKey("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY", "BASE_SEPOLIA_DEPLOYER_ADDRESS");
        (uint256 adminKey, address registryAdmin) =
            _validatedKey("BASE_SEPOLIA_REGISTRY_ADMIN_PRIVATE_KEY", "BASE_SEPOLIA_REGISTRY_ADMIN");
        address policyAdmin = _requiredAddress("BASE_SEPOLIA_MOCK_POLICY_ADMIN");
        address initialHolder = _requiredAddress("BASE_SEPOLIA_MOCK_INITIAL_HOLDER");
        uint256 initialRawAmount = vm.envUint("BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT");
        if (initialRawAmount == 0) revert InvalidAmount("BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT");

        vm.startBroadcast(deployerKey);
        registry = new KynloAssetRegistry(registryAdmin);
        vault = new KynloVault(address(registry));
        mockAsset = new MockB20PolicyAsset(policyAdmin, initialHolder, initialRawAmount);
        if (registryAdmin == deployer) {
            registry.setSupportedStock(address(mockAsset), true);
        }
        vm.stopBroadcast();

        if (registryAdmin != deployer) {
            vm.startBroadcast(adminKey);
            registry.setSupportedStock(address(mockAsset), true);
            vm.stopBroadcast();
        }

        if (registry.owner() != registryAdmin) {
            revert RegistryOwnerMismatch(registryAdmin, registry.owner());
        }
        if (address(vault.assetRegistry()) != address(registry)) {
            revert RegistryWiringMismatch(address(registry), address(vault.assetRegistry()));
        }
        if (!registry.isSupportedStock(address(mockAsset))) {
            revert MockAdmissionFailed(address(mockAsset));
        }
    }
}
