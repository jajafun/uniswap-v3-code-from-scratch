// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Position {

    struct Info {
        uint128 liquidity;
    }

    /**
     * @dev 在特定的位置添加流动性
     */
    function update(Info storage self, uint128 liquidityDelta) internal {
        uint128 liquidityBefore = self.liquidity;
        uint128 liquidityAfter = liquidityBefore + liquidityDelta;
        self.liquidity = liquidityAfter;
    }

    function get(mapping(bytes32 => Info) storage self, address owner, int24 lowerTick, int24 upperTick)
        internal view returns (Position.Info storage position) {
        position = self[keccak256(abi.encodePacked(owner, lowerTick, upperTick))];
    }

}
