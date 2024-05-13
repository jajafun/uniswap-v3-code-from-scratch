// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./LiquidityMath.sol";

library Tick {

    struct Info {
        bool initialized;
        // tick总的流动性，用来确定一个tick是否可用
        uint128 liquidityGross;
        // 跨ticks时增加或减少的流动性
        int128 liquidityNet;
    }

    /**
     * @dev 初始化一个流动性为0的tick并在上面添加新的流动性
     */
    function update(
        mapping(int24 => Tick.Info) storage self,
        int24 tick,
        int128 liquidityDelta,
        bool upper
    ) internal returns (bool flipped){
        Tick.Info storage tickInfo = self[tick];
        uint128 liquidityBefore = tickInfo.liquidityGross;
        uint128 liquidityAfter = LiquidityMath.addLiquidity(liquidityBefore, liquidityDelta);

        // true 的情况
        // 1. 添加流动性到一个空的tick liquidityBefore为0，liquidityAfter不为0
        // 2. 一个tick被耗尽，liquidityBefore不为0，liquidityAfter为0
        flipped = (liquidityBefore == 0) != (liquidityAfter == 0);

        if (liquidityBefore == 0) {
            tickInfo.initialized = true;
        }
        tickInfo.liquidityGross = liquidityAfter;
        tickInfo.liquidityNet = upper ?
            int128(int256(tickInfo.liquidityNet) - liquidityDelta) :
            int128(int256(tickInfo.liquidityNet) + liquidityDelta);
    }

    function cross(mapping(int24 => Tick.Info) storage self, int24 tick) internal view
        returns (int128 liquidityDelta) {
        Tick.Info storage info = self[tick];
        liquidityDelta = info.liquidityNet;
    }
}
