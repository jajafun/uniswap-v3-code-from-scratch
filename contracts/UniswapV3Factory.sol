// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IUniswapV3PoolDeployer.sol";
import "./UniswapV3Pool.sol";

contract UniswapV3Factory is IUniswapV3PoolDeployer {

    error PoolAlreadyExists();
    error ZeroAddressNotAllowed();
    error TokensMustBeDifferent();
    error UnsupportedTickSpacing();

    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed tickSpacing,
        address pool
    );

    PoolParameters public parameters;

    mapping(uint24 => bool) public tickSpacings;
    mapping(address => mapping(address => mapping(uint24 => address))) public pools;

    constructor() {
        tickSpacings[10] = true;
        tickSpacings[60] = true;
    }

    function createPool(
        address token0Address,
        address token1Address,
        uint24 tickSpacing
    ) public returns (address poolAddress) {
        if (token0Address == token1Address) {
            revert TokensMustBeDifferent();
        }
        if (!tickSpacings[tickSpacing]) {
            revert UnsupportedTickSpacing();
        }

        (token0Address, token1Address) = token0Address < token1Address ? (token0Address, token1Address) : (token1Address, token0Address);

        if (token0Address == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        if (pools[token0Address][token1Address][tickSpacing] != address(0)) {
            revert PoolAlreadyExists();
        }

        parameters = PoolParameters({
            factoryAddress: address(this),
            token0Address: token0Address,
            token1Address: token1Address,
            tickSpacing: tickSpacing
        });

        poolAddress = address(new UniswapV3Pool{
                salt: keccak256(abi.encodePacked(token0Address, token1Address, tickSpacing))
            }()
        );

        delete parameters;

        pools[token0Address][token1Address][tickSpacing] = poolAddress;
        pools[token1Address][token0Address][tickSpacing] = poolAddress;

        emit PoolCreated(token0Address, token1Address, tickSpacing, poolAddress);
    }
}
