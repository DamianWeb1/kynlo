// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IKynloAssetRegistry {
    function isSupportedStock(address token) external view returns (bool);
    function newDepositsPaused() external view returns (bool);
}
