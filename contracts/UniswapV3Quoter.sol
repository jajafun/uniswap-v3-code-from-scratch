// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IUniswapV3Pool.sol";
import "./lib/TickMath.sol";

// 在swap之前根据用户要卖出的token数量预先计算出用户会得到token数量
// 通过模拟一个真实swap来算，算好了之后打断它
contract UniswapV3Quoter {

    struct QuoteParams {
        address poolAddress;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
        bool zeroForOne;
    }

    // 报价接口
    function quote(QuoteParams memory params) public
        returns (uint256 amountOut, uint160 sqrtPriceX96After, int24 tickAfter) {

        uint160 sqrtPriceTargetX96 = params.sqrtPriceLimitX96;
        if (params.sqrtPriceLimitX96 == 0) {
            if (params.zeroForOne) {
                sqrtPriceTargetX96 = TickMath.MIN_SQRT_RATIO + 1;
            } else {
                sqrtPriceTargetX96 = TickMath.MAX_SQRT_RATIO - 1;
            }
        }
        try IUniswapV3Pool(params.poolAddress).swap(
            address(this),
            params.zeroForOne,
            params.amountIn,
            sqrtPriceTargetX96,
            abi.encode(params.poolAddress)
        ) {}
        catch (bytes memory reason) {
            return abi.decode(reason, (uint256, uint160, int24));
        }
    }

    // 打断模拟的真实交易
    function uniswapV3SwapCallback (
        int256 amount0Delta,
        int256 amount1Delta,
        bytes memory data
    ) external view {
        address poolAddress = abi.decode(data, (address));
        uint256 amountOut = amount0Delta > 0 ? uint256(-amount1Delta) : uint256(-amount0Delta);
        (uint160 sqrtPriceX96After, int24 tickAfter) = IUniswapV3Pool(poolAddress).slot0();
        assembly {
            // mload: 加载指定内存地址的值
            // mstore: 设置指定内存的值
            // add: 加法运算
            // revert: 中止执行并返回异常给调用者
            // 0x40 内存第64字节，特殊标记当前可用的地址
            let ptr := mload(0x40)
            mstore(ptr, amountOut)
            mstore(add(ptr, 0x20), sqrtPriceX96After)
            mstore(add(ptr, 0x40), tickAfter)
            revert(ptr, 96)
        }
    }
}
