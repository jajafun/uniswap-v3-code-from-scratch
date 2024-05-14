// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IUniswapV3Pool.sol";
import "./lib/TickMath.sol";
import "./lib/PoolAddress.sol";
import "./lib/Path.sol";

// 在swap之前根据用户要卖出的token数量预先计算出用户会得到token数量
// 通过模拟一个真实swap来算，算好了之后打断它
contract UniswapV3Quoter {

    using Path for bytes;

    address public immutable factoryAddress;

    constructor(address _factoryAddress) {
        factoryAddress = _factoryAddress;
    }

    struct QuoteSingleParams {
        address tokenInAddress;
        address tokenOutAddress;
        uint24 tickSpacing;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
    }

    function quote(bytes memory path, uint256 amountIn) public
    returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, int24[] memory tickAfterList){
        sqrtPriceX96AfterList = new uint160[](path.numPools());
        tickAfterList = new int24[](path.numPools());

        uint256 i = 0;
        while (true) {
            (address tokenInAddress, address tokenOutAddress, uint24 tickSpacing) = path.decodeFirstPool();
            (uint256 amountOut_, uint160 sqrtPriceX96After, int24 tickAfter) = quoteSingle(
                QuoteSingleParams({
                    tokenInAddress: tokenInAddress,
                    tokenOutAddress: tokenOutAddress,
                    tickSpacing: tickSpacing,
                    amountIn: amountIn,
                    sqrtPriceLimitX96: 0
                })
            );

            sqrtPriceX96AfterList[i] = sqrtPriceX96After;
            tickAfterList[i] = tickAfter;
            amountIn = amountOut_;
            i++;

            if (path.hasMultiplePools()) {
                path = path.skipToken();
            } else {
                amountOut = amountIn;
                break;
            }
        }
    }

    function quoteSingle(QuoteSingleParams memory params) public
    returns (uint256 amountOut, uint160 sqrtPriceX96After, int24 tickAfter) {
        IUniswapV3Pool pool = getPool(
            params.tokenInAddress,
            params.tokenOutAddress,
            params.tickSpacing
        );
        bool zeroForOne = params.tokenInAddress < params.tokenOutAddress;

        uint160 sqrtPriceTargetX96 = params.sqrtPriceLimitX96;
        if (params.sqrtPriceLimitX96 == 0) {
            if (zeroForOne) {
                sqrtPriceTargetX96 = TickMath.MIN_SQRT_RATIO + 1;
            } else {
                sqrtPriceTargetX96 = TickMath.MAX_SQRT_RATIO - 1;
            }
        }

        try pool.swap(
            address(this),
            zeroForOne,
            params.amountIn,
            sqrtPriceTargetX96,
            abi.encode(address(pool))
        ) {}
        catch (bytes memory reason) {
            return abi.decode(reason, (uint256, uint160, int24));
        }
    }

    // 打断模拟的真实交易
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes memory data
    ) external view {
        address poolAddress = abi.decode(data, (address));
        uint256 amountOut = amount0Delta > 0 ? uint256(- amount1Delta) : uint256(- amount0Delta);
        (uint160 sqrtPriceX96After, int24 tickAfter,,,) = IUniswapV3Pool(poolAddress).slot0();
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

    function getPool(
        address token0Address,
        address token1Address,
        uint24 tickSpacing
    ) internal view returns (IUniswapV3Pool pool) {
        (token0Address, token1Address) = token0Address < token1Address
            ? (token0Address, token1Address) : (token1Address, token0Address);
        address poolAddress = PoolAddress.computePoolAddress(factoryAddress, token0Address, token1Address, tickSpacing);
        pool = IUniswapV3Pool(poolAddress);
    }
}
