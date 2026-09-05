// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Controls which verified stock contracts are accepted for new Kynlo Vault deposits.
/// @dev Disabling a token never affects an existing position's withdrawal or Succession path.
contract KynloAssetRegistry is Ownable2Step {
    mapping(address token => bool supported) private _supportedStocks;

    bool public newDepositsPaused;

    error InvalidToken();
    error SupportUnchanged();
    error PauseStateUnchanged();

    event SupportedStockSet(address indexed token, bool supported);
    event NewDepositsPauseSet(bool paused);

    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
    }

    function setSupportedStock(address token, bool supported) external onlyOwner {
        if (token == address(0) || token.code.length == 0) revert InvalidToken();
        if (_supportedStocks[token] == supported) revert SupportUnchanged();
        _supportedStocks[token] = supported;
        emit SupportedStockSet(token, supported);
    }

    /// @notice Pauses admission of new deposits without affecting existing positions.
    function setNewDepositsPaused(bool paused) external onlyOwner {
        if (newDepositsPaused == paused) revert PauseStateUnchanged();
        newDepositsPaused = paused;
        emit NewDepositsPauseSet(paused);
    }

    function isSupportedStock(address token) external view returns (bool) {
        return _supportedStocks[token];
    }
}
