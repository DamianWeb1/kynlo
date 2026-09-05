// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Read-only surface used by offchain clients. Raw ERC-20 units remain authoritative in custody.
interface IB20AssetMinimal {
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}
