// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./TickMath.sol";
import "./LiquidityMath.sol";
import "./FixedPoint96.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract TestUtils {

    struct LiquidityRange {
        int24 lowerTick;
        int24 upperTick;
        uint128 amount;
    }

    function tick(uint256 price) public pure returns (int24) {
        // price -> sqrtP -> Q96
        int160 a = int160(ABDKMath64x64.sqrt(int128(int256(price << 64))) << (FixedPoint96.RESOLUTION - 64));
        // sqrtP -> tick
        return TickMath.getTickAtSqrtRatio(uint160(a));
    }

    function tick60(uint256 price) public pure returns (int24 tick_) {
        tick_ = tick(price);
        tick_ = nearestUsableTick(tick_, 60);
    }

    function nearestUsableTick(int24 tick_, uint24 tickSpacing)
        public pure returns (int24 result) {
        result =
            int24(divRound(int128(tick_), int128(int24(tickSpacing)))) *
            int24(tickSpacing);

        if (result < TickMath.MIN_TICK) {
            result += int24(tickSpacing);
        } else if (result > TickMath.MAX_TICK) {
            result -= int24(tickSpacing);
        }
    }

    function divRound(int128 x, int128 y)
        public pure returns (int128 result) {
        int128 quot = ABDKMath64x64.div(x, y);
        result = quot >> 64;

        // Check if remainder is greater than 0.5
        if (quot % 2 ** 64 >= 0x8000000000000000) {
            result += 1;
        }
    }

    function sqrtP(uint256 price) public pure returns (uint160) {
        int24 tickIndex = tick(price);
        // tick -> sqrtP
        return TickMath.getSqrtRatioAtTick(tickIndex);
    }

    function liquidityRange(
        uint256 lowerPrice,
        uint256 upperPrice,
        uint256 currentPrice,
        uint256 amount0,
        uint256 amount1
    ) public pure returns (LiquidityRange memory range) {
        range = LiquidityRange({
            lowerTick: tick(lowerPrice),
            upperTick: tick(upperPrice),
            amount: LiquidityMath.getLiquidityForAmounts(
                sqrtP(currentPrice),
                sqrtP(lowerPrice),
                sqrtP(upperPrice),
                amount0,
                amount1
            )
        });
    }

    function getSqrtRatioAtTick(int24 tickParam) public pure returns (uint160){
        return TickMath.getSqrtRatioAtTick(tickParam);
    }

    function getLiquidityForAmounts(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceLowerX96,
        uint160 sqrtPriceUpperX96,
        uint256 amount0,
        uint256 amount1
    ) public pure returns (uint128) {
        return LiquidityMath.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            amount0,
            amount1
        );
    }
}
