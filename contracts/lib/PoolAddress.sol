// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.24;

import {UniswapV3Pool} from "../UniswapV3Pool.sol";

library PoolAddress {

    function computePoolAddress(
        address factoryAddress,
        address token0Address,
        address token1Address,
        uint24 tickSpacing
    ) internal pure returns (address poolAddress) {
        require(token0Address < token1Address);

        // EIP-1014: https://eips.ethereum.org/EIPS/eip-1014
        poolAddress = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            factoryAddress,
                            keccak256(abi.encodePacked(token0Address, token1Address, tickSpacing)),
                            keccak256(type(UniswapV3Pool).creationCode)
                        )
                    )
                )
            )
        );
    }
}
