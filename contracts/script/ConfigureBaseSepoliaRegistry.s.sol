// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";

/// @notice Admits one MOCK asset for new Base Sepolia deposits.
contract ConfigureBaseSepoliaRegistry is BaseSepoliaScript {
    error RegistryAdminMismatch(address expected, address actual);
    error AddressHasNoCode(address account);

    function run() external {
        _requireBaseSepolia();
        (uint256 adminKey, address admin) =
            _validatedKey("BASE_SEPOLIA_REGISTRY_ADMIN_PRIVATE_KEY", "BASE_SEPOLIA_REGISTRY_ADMIN");
        address registryAddress = _requiredAddress("BASE_SEPOLIA_REGISTRY_ADDRESS");
        address mockAsset = _requiredAddress("BASE_SEPOLIA_MOCK_ASSET_ADDRESS");
        if (registryAddress.code.length == 0) revert AddressHasNoCode(registryAddress);
        if (mockAsset.code.length == 0) revert AddressHasNoCode(mockAsset);

        KynloAssetRegistry registry = KynloAssetRegistry(registryAddress);
        if (registry.owner() != admin) revert RegistryAdminMismatch(admin, registry.owner());

        vm.startBroadcast(adminKey);
        registry.setSupportedStock(mockAsset, true);
        vm.stopBroadcast();
    }
}
