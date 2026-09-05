// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface VmScript {
    function addr(uint256 privateKey) external returns (address);
    function envAddress(string calldata name) external returns (address);
    function envUint(string calldata name) external returns (uint256);
    function prank(address account) external;
    function startPrank(address account) external;
    function stopPrank() external;
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function warp(uint256 timestamp) external;
}

abstract contract BaseSepoliaScript {
    uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84_532;
    VmScript internal constant vm =
        VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error InvalidAddress(string field);
    error InvalidAmount(string field);
    error UnexpectedSigner(address expected, address actual);

    function _requireBaseSepolia() internal view {
        if (block.chainid != BASE_SEPOLIA_CHAIN_ID) revert WrongChain(block.chainid);
    }

    function _requiredAddress(string memory name) internal returns (address value) {
        value = vm.envAddress(name);
        if (value == address(0)) revert InvalidAddress(name);
    }

    function _validatedKey(string memory keyName, string memory addressName)
        internal
        returns (uint256 privateKey, address signer)
    {
        privateKey = vm.envUint(keyName);
        address expected = _requiredAddress(addressName);
        signer = vm.addr(privateKey);
        if (signer != expected) revert UnexpectedSigner(expected, signer);
    }
}
