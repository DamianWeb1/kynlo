// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { TestBase } from "./TestBase.sol";
import { KynloVault } from "../src/KynloVault.sol";
import { KynloAssetRegistry } from "../src/KynloAssetRegistry.sol";
import { MockPolicyToken } from "./mocks/MockPolicyToken.sol";

contract VaultAccountingHandler is TestBase {
    KynloVault public immutable vault;
    MockPolicyToken public immutable token;
    uint256 public immutable planId;
    uint256 public shadowAttributed;

    constructor(KynloVault vault_, MockPolicyToken token_) {
        vault = vault_;
        token = token_;
        KynloVault.Successor[] memory successors = new KynloVault.Successor[](1);
        successors[0] = KynloVault.Successor(address(0xB0B), 10_000);
        planId = vault.createLegacyPlan(successors, 90 days, 30 days);
        token.approve(address(vault), type(uint256).max);
    }

    function deposit(uint96 rawSeed) external {
        uint256 available = token.balanceOf(address(this));
        if (available == 0) return;
        uint256 amount = _bound(rawSeed, 1, available);
        vault.depositAsset(planId, address(token), amount);
        shadowAttributed += amount;
    }

    function withdraw(uint96 rawSeed) external {
        if (shadowAttributed == 0) return;
        uint256 amount = _bound(rawSeed, 1, shadowAttributed);
        vault.withdrawAsset(planId, address(token), amount);
        shadowAttributed -= amount;
    }
}

contract KynloVaultInvariantTest is TestBase {
    KynloAssetRegistry internal registry;
    KynloVault internal vault;
    MockPolicyToken internal token;
    VaultAccountingHandler internal handler;
    address[] internal invariantTargets;

    function setUp() public {
        registry = new KynloAssetRegistry(address(this));
        vault = new KynloVault(address(registry));
        token = new MockPolicyToken("Invariant Stock", "INV");
        registry.setSupportedStock(address(token), true);
        handler = new VaultAccountingHandler(vault, token);
        token.mint(address(handler), type(uint96).max);
        invariantTargets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return invariantTargets;
    }

    function invariant_attributionEqualsPositionAccounting() public view {
        KynloVault.AssetPosition[] memory assets = vault.getAssets(handler.planId());
        uint256 positionRemaining = assets.length == 0 ? 0 : assets[0].remaining;
        assertEq(vault.totalAttributed(address(token)), positionRemaining);
        assertEq(handler.shadowAttributed(), positionRemaining);
    }

    function invariant_vaultBalanceAlwaysCoversAttributableAssets() public view {
        assertTrue(token.balanceOf(address(vault)) >= vault.totalAttributed(address(token)));
    }
}
