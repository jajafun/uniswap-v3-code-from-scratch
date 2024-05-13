// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IUniswapV3FlashCallback {

    function uniswapV3FlashCallback(bytes calldata data) external;
}
