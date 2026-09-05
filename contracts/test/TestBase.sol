// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function assume(bool) external;
}

abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertTrue(bool value) internal pure {
        require(value, "assertTrue");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "assertFalse");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assertEq uint");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "assertEq address");
    }

    function _bound(uint256 value, uint256 minimum, uint256 maximum)
        internal
        pure
        returns (uint256)
    {
        require(minimum <= maximum, "invalid bounds");
        if (value >= minimum && value <= maximum) return value;
        return minimum + (value % (maximum - minimum + 1));
    }
}
