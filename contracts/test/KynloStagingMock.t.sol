// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { TestBase } from "./TestBase.sol";
import { MockB20PolicyAsset } from "../staging/MockB20PolicyAsset.sol";

contract KynloStagingMockTest is TestBase {
    address internal constant ADMIN = address(0xA11CE);
    address internal constant HOLDER = address(0xB0B);
    address internal constant RECEIVER = address(0xCAFE);

    MockB20PolicyAsset internal asset;

    function setUp() public {
        asset = new MockB20PolicyAsset(ADMIN, HOLDER, 1_000);
    }

    function testMockAssetIsExplicitlyLabelledAndInitiallyFunded() public view {
        assertEq(asset.balanceOf(HOLDER), 1_000);
        assertTrue(keccak256(bytes(asset.symbol())) == keccak256(bytes("MOCK-B20")));
    }

    function testMockPolicyBlocksTransferWithoutMovingBalance() public {
        vm.prank(ADMIN);
        asset.setPolicyBlocked(RECEIVER, true);

        vm.prank(HOLDER);
        vm.expectRevert();
        asset.transfer(RECEIVER, 100);

        assertEq(asset.balanceOf(HOLDER), 1_000);
        assertEq(asset.balanceOf(RECEIVER), 0);
    }

    function testStrangerCannotChangeMockPolicy() public {
        vm.prank(RECEIVER);
        vm.expectRevert();
        asset.setPolicyBlocked(HOLDER, true);
    }
}
