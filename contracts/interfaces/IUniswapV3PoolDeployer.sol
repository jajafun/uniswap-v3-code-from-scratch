// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IUniswapV3PoolDeployer {

    struct PoolParameters {
        address factoryAddress;
        address token0Address;
        address token1Address;
        uint24 tickSpacing;
    }

    function parameters() external returns (
        address factoryAddress,
        address token0Address,
        address token1Address,
        uint24 tickSpacing
    );
}
