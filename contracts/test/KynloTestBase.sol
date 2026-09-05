// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TestBase} from "./TestBase.sol";
import {KynloVault} from "../src/KynloVault.sol";
import {KynloAssetRegistry} from "../src/KynloAssetRegistry.sol";
import {MockPolicyToken} from "./mocks/MockPolicyToken.sol";

abstract contract KynloTestBase is TestBase {
    address internal constant OWNER = address(0xA11CE);
    address internal constant SUCCESSOR_A = address(0xB0B);
    address internal constant SUCCESSOR_B = address(0xCAFE);
    address internal constant SUCCESSOR_C = address(0xD00D);
    address internal constant STRANGER = address(0xBAD);

    KynloAssetRegistry internal registry;
    KynloVault internal vault;
    MockPolicyToken internal stock;
    MockPolicyToken internal secondStock;

    function setUp() public virtual {
        registry = new KynloAssetRegistry(address(this));
        vault = new KynloVault(address(registry));
        stock = new MockPolicyToken("Mock Coinbase Stock", "MOCKc");
        secondStock = new MockPolicyToken("Mock Second Stock", "MOCK2");
        registry.setSupportedStock(address(stock), true);
        registry.setSupportedStock(address(secondStock), true);
        stock.mint(OWNER, type(uint128).max);
        secondStock.mint(OWNER, type(uint128).max);
    }

    function _twoSuccessors() internal pure returns (KynloVault.Successor[] memory list) {
        list = new KynloVault.Successor[](2);
        list[0] = KynloVault.Successor(SUCCESSOR_A, 6_000);
        list[1] = KynloVault.Successor(SUCCESSOR_B, 4_000);
    }

    function _create() internal returns (uint256 planId) {
        vm.prank(OWNER);
        planId = vault.createLegacyPlan(_twoSuccessors(), 90 days, 30 days);
    }

    function _deposit(uint256 planId, MockPolicyToken token, uint256 amount) internal {
        vm.startPrank(OWNER);
        token.approve(address(vault), amount);
        vault.depositAsset(planId, address(token), amount);
        vm.stopPrank();
    }

    function _acceptAll(uint256 planId) internal {
        vm.prank(SUCCESSOR_A);
        vault.acceptSuccessor(planId);
        vm.prank(SUCCESSOR_B);
        vault.acceptSuccessor(planId);
    }

    function _activePlan(uint256 amount) internal returns (uint256 planId) {
        planId = _create();
        _deposit(planId, stock, amount);
        _acceptAll(planId);
        vm.prank(OWNER);
        vault.armLegacyPlan(planId);
    }

    function _mature(uint256 planId) internal {
        (
            address planOwner,
            uint64 createdAt,
            uint64 lastCheckIn,
            uint64 inactivity,
            uint64 protection,
            uint32 successorVersion,
            bool armed,
            bool cancelled,
            bool completed
        ) = vault.legacyPlans(planId);
        planOwner;
        createdAt;
        successorVersion;
        armed;
        cancelled;
        completed;
        vm.warp(uint256(lastCheckIn) + inactivity + protection);
    }
}
