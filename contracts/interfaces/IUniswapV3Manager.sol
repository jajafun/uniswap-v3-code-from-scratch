// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IUniswapV3Manager {
    struct MintParams {
        address token0Address;
        address token1Address;
        uint24 fee;
        int24 lowerTick;
        int24 upperTick;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
    }

    struct SwapSingleParams {
        address tokenInAddress;
        address tokenOutAddress;
        uint24 fee;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
    }

    struct SwapParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    struct SwapCallbackData {
        bytes path;
        address payerAddress;
    }
}
