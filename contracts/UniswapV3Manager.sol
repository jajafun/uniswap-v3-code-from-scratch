// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV3Manager.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./lib/TickMath.sol";
import "./lib/LiquidityMath.sol";
import "hardhat/console.sol";

contract UniswapV3Manager is IUniswapV3Manager {

    error SlippageCheckFailed(uint256 amount0, uint256 amount1);

    function mint(MintParams calldata params) public returns (uint256 amount0, uint256 amount1) {
        IUniswapV3Pool pool = IUniswapV3Pool(params.poolAddress);

        (uint160 sqrtPriceX96,) = pool.slot0();
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtRatioAtTick(params.lowerTick);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtRatioAtTick(params.upperTick);

        uint128 liquidity = LiquidityMath.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            params.amount0Desired,
            params.amount1Desired
        );

        (amount0, amount1) = pool.mint(
            msg.sender,
            params.lowerTick,
            params.upperTick,
            liquidity,
            abi.encode(
                IUniswapV3Pool.CallbackData({
                    token0: pool.token0(),
                    token1: pool.token1(),
                    payer: msg.sender
                })
            )
        );

        if (amount0 < params.amount0Min || amount1 < params.amount1Min) {
            revert SlippageCheckFailed(amount0, amount1);
        }
    }

    function swap(
        address poolAddress,
        bool zeroForOne,
        uint256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) public returns (int256, int256) {
        return IUniswapV3Pool(poolAddress).swap(
            msg.sender,
            zeroForOne,
            amountSpecified,
            sqrtPriceLimitX96,
            data
        );
    }

    function flash(
        address poolAddress,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) public {
        return IUniswapV3Pool(poolAddress).flash(amount0, amount1, data);
    }

    // 用户amount0和amount1给池子
    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) public {
        IUniswapV3Pool.CallbackData memory callbackData = abi.decode(data, (IUniswapV3Pool.CallbackData));
//        console.log("TransferFrom token0: %s, sender: %s, receiver: %s",
//            callbackData.token0, callbackData.payer, msg.sender);
//        console.log("amount0: %s", amount0);
        IERC20(callbackData.token0).transferFrom(callbackData.payer, msg.sender, amount0);
        IERC20(callbackData.token1).transferFrom(callbackData.payer, msg.sender, amount1);
    }

    // 用户要卖amount0就只转amount0给池子, 要卖amount1就只转amount1给池子，二选一
    function uniswapV3SwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) public {
        IUniswapV3Pool.CallbackData memory callbackData = abi.decode(data, (IUniswapV3Pool.CallbackData));
        if (amount0 > 0) {
            IERC20(callbackData.token0).transferFrom(callbackData.payer, msg.sender, uint256(amount0));
        }
        if (amount1 > 0) {
            IERC20(callbackData.token1).transferFrom(callbackData.payer, msg.sender, uint256(amount1));
        }
    }

    function uniswapV3FlashCallback(bytes calldata data) public {
        (address token0, address token1, uint256 amount0, uint256 amount1) = abi.decode(data,
            (address, address, uint256, uint256));

        // todo do something

        if (amount0 > 0) {
            IERC20(token0).transfer(msg.sender, uint256(amount0));
        }
        if (amount1 > 0) {
            IERC20(token1).transfer(msg.sender, uint256(amount1));
        }
    }

}
