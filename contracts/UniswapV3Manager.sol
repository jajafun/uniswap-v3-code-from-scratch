// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV3Manager.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./lib/TickMath.sol";
import "./lib/LiquidityMath.sol";
import "./lib/PoolAddress.sol";
import "./lib/Path.sol";
import "hardhat/console.sol";

contract UniswapV3Manager is IUniswapV3Manager {
    using Path for bytes;

    error SlippageCheckFailed(uint256 amount0, uint256 amount1);
    error TooLittleReceived(uint256 amountOut);

    address public immutable factoryAddress;

    constructor(address _factoryAddress) {
        factoryAddress = _factoryAddress;
    }

    function mint(MintParams calldata params) public returns (uint256 amount0, uint256 amount1) {
        address poolAddress = PoolAddress.computePoolAddress(
            factoryAddress,
            params.token0Address,
            params.token1Address,
            params.tickSpacing
        );
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        console.log("poolAddress %s", poolAddress);

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

    function swapSingle(SwapSingleParams calldata params) public returns (uint256 amountOut){
        amountOut = _swap(
            params.amountIn,
            msg.sender,
            params.sqrtPriceLimitX96,
            SwapCallbackData({
                path: abi.encodePacked(
                    params.tokenInAddress,
                    params.tickSpacing,
                    params.tokenOutAddress
                ),
                payerAddress: msg.sender
            })
        );
    }

    function swap(SwapParams memory params) public returns (uint256 amountOut) {
        address payerAddress = msg.sender;
        bool hasMultiplePools;

        while (true) {
            hasMultiplePools = params.path.hasMultiplePools();
            address actualRecipient = hasMultiplePools ? address(this) : params.recipient;

            params.amountIn = _swap(
                params.amountIn,
                actualRecipient,
                0,
                SwapCallbackData({
                    path: params.path.getFirstPool(),
                    payerAddress: payerAddress
                })
            );

            if (hasMultiplePools) {
                payerAddress = address(this);
                params.path = params.path.skipToken();
            } else {
                amountOut = params.amountIn;
                break;
            }
        }

        if (amountOut < params.minAmountOut) {
            revert TooLittleReceived(amountOut);
        }
    }

    function _swap(
        uint256 amountIn,
        address recipient,
        uint160 sqrtPriceLimitX96,
        SwapCallbackData memory data
    ) public returns (uint256 amountOut) {
        (address tokenInAddress, address tokenOutAddress, uint24 tickSpacing) = data.path.decodeFirstPool();
        bool zeroForOne = tokenInAddress < tokenOutAddress;
        uint160 sqrtPriceLimit = sqrtPriceLimitX96;
        if (sqrtPriceLimitX96 == 0) {
            if (zeroForOne) {
                sqrtPriceLimit = TickMath.MIN_SQRT_RATIO + 1;
            } else {
                sqrtPriceLimit = TickMath.MAX_SQRT_RATIO - 1;
            }
        }
        console.log("tokenInAddress %s", tokenInAddress);
        console.log("tokenOutAddress %s", tokenOutAddress);
        console.log("tickSpacing %s", tickSpacing);
        (int256 amount0, int256 amount1) = getPool(tokenInAddress, tokenOutAddress, tickSpacing).swap(
            recipient,
            zeroForOne,
            amountIn,
            sqrtPriceLimit,
            abi.encode(data)
        );
        amountOut = uint256(- (zeroForOne ? amount1 : amount0));
    }

    function getPool(
        address token0Address,
        address token1Address,
        uint24 tickSpacing
    ) internal view returns (IUniswapV3Pool pool) {
        (token0Address, token1Address) = token0Address < token1Address
            ? (token0Address, token1Address) : (token1Address, token0Address);
        address poolAddress = PoolAddress.computePoolAddress(factoryAddress, token0Address, token1Address, tickSpacing);
        console.log("poolAddress2 %s", poolAddress);
        pool = IUniswapV3Pool(poolAddress);
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
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));
        (address tokenInAddress, address tokenOutAddress,) = callbackData.path.decodeFirstPool();
        bool zeroForOne = tokenInAddress < tokenOutAddress;
        int256 amount = zeroForOne ? amount0 : amount1;

        if (callbackData.payerAddress == address(this)) {
            IERC20(tokenInAddress).transfer(msg.sender, uint256(amount));
        } else {
            IERC20(tokenInAddress).transferFrom(callbackData.payerAddress, msg.sender, uint256(amount));
        }
    }

    function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes calldata data) public {
        (address token0, address token1, uint256 amount0, uint256 amount1) = abi.decode(data,
            (address, address, uint256, uint256));

        // todo do something

        if (amount0 > 0) {
            IERC20(token0).transfer(msg.sender, amount0 + fee0);
        }
        if (amount1 > 0) {
            IERC20(token1).transfer(msg.sender, amount1 + fee1);
        }
    }

}
