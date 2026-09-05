// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { BaseSepoliaScript } from "./BaseSepoliaScript.sol";
import { MockB20PolicyAsset } from "../staging/MockB20PolicyAsset.sol";

/// @notice Deploys an explicitly labelled mock policy-aware asset for Base Sepolia staging.
contract DeployMockB20Asset is BaseSepoliaScript {
    function run() external returns (MockB20PolicyAsset mockAsset) {
        _requireBaseSepolia();
        (uint256 deployerKey,) =
            _validatedKey("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY", "BASE_SEPOLIA_DEPLOYER_ADDRESS");
        address policyAdmin = _requiredAddress("BASE_SEPOLIA_MOCK_POLICY_ADMIN");
        address initialHolder = _requiredAddress("BASE_SEPOLIA_MOCK_INITIAL_HOLDER");
        uint256 initialRawAmount = vm.envUint("BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT");
        if (initialRawAmount == 0) revert InvalidAmount("BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT");

        vm.startBroadcast(deployerKey);
        mockAsset = new MockB20PolicyAsset(policyAdmin, initialHolder, initialRawAmount);
        vm.stopBroadcast();
    }
}
