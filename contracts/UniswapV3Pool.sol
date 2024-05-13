// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV3MintCallback.sol";
import "./interfaces/IUniswapV3SwapCallback.sol";
import "./interfaces/IUniswapV3FlashCallback.sol";
import "./interfaces/IUniswapV3PoolDeployer.sol";
import "./interfaces/IUniswapV3Pool.sol";

import "./lib/Tick.sol";
import "./lib/Position.sol";
import "./lib/TickBitmap.sol";
import "./lib/Math.sol";
import "./lib/TickMath.sol";
import "./lib/SwapMath.sol";
import "./lib/LiquidityMath.sol";

import "hardhat/console.sol";

contract UniswapV3Pool is IUniswapV3Pool {

    using Tick for mapping(int24 => Tick.Info);
    using TickBitmap for mapping(int16 => uint256);
    using Position for mapping(bytes32 => Position.Info);
    using Position for Position.Info;

    error InsufficientInputAmount();
    error InvalidPriceLimit();
    error InvalidTickRange();
    error ZeroLiquidity();
    error NotEnoughLiquidity();
    error AlreadyInitialized();

    event Mint(
        address sender,
        address indexed owner,
        int24 indexed lowerTick,
        int24 indexed upperTick,
        uint128 liquidityDelta,
        uint256 amount0,
        uint256 amount1
    );

    event Swap(
        address indexed sender,
        address indexed recipient,
        int256 amount0,
        int256 amount1,
        uint160 sqrtPrice96,
        uint128 liquidity,
        int24 tick
    );

    event Flash(
        address indexed recipient,
        uint256 amount0,
        uint256 amount1
    );

    // 价格的下限
    int24 internal constant MIN_TICK = - 887272;
    // 价格的上限
    int24 internal constant MAX_TICK = - MIN_TICK;

    address public immutable factory;
    address public immutable token0;
    address public immutable token1;
    address public immutable tickSpacing;

    // 把经常同时读取的变量封装在一起，节省gas
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
    }

    Slot0 public slot0;

    // 一笔swap的状态
    struct SwapState {
        // 用户要卖出的token数量还剩下多少没有处理
        uint256 amountSpecifiedRemaining;
        // 已经处理的用户换到的token数量
        uint256 amountCalculated;
        // 处理到现在此时此时的价格
        uint160 sqrtPriceX96;
        // 处理到现在此时此刻的tick
        int24 tick;
        //
        uint128 liquidity;
    }

    // 一笔swap中每一步的状态
    struct StepState {
        // 这一步开始时候的价格
        uint160 sqrtPriceStartX96;
        // 能够为交易提供流动性的下一个已经初始化好的tick
        int24 nextTick;
        //
        bool initialized;
        // nextTick的价格
        uint160 sqrtPriceNextX96;
        // 当前tick能处理的用户卖出的token数量
        uint256 amountIn;
        // 当前tick能处理的用户换到的token数量
        uint256 amountOut;
    }

    // 流动性数量L
    uint128 public liquidity;

    // 池子的ticks信息
    mapping(int24 => Tick.Info) public ticks;
    // ticks索引
    mapping(int16 => uint256) public tickBitmap;
    // 池子的所有流动性位置信息
    // key是lp地址 + lowerTick索引 + upperTick索引的hash值
    mapping(bytes32 => Position.Info) public positions;

    constructor() {
        (factory, token0, token1, tickSpacing) = IUniswapV3PoolDeployer(msg.sender).parameters();
    }

    function initialize(uint160 sqrtPriceX96) public {
        if (slot0.sqrtPriceX96 != 0) {
            revert AlreadyInitialized();
        }
        int24 tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
        slot0 = Slot0({
            sqrtPriceX96: sqrtPriceX96,
            tick: tick
        });
    }

    /**
     * @dev 提供流动性，和v2的函数名保持一致
     * @param lpAddress token所有者的地址，识别是谁来提供流动性
     * @param lowerTick 下界tick
     * @param upperTick 上界tick
     * @param liquidityDelta 要提供的流动性数量
     */
    function mint(
        address lpAddress,
        int24 lowerTick,
        int24 upperTick,
        uint128 liquidityDelta,
        bytes calldata data
    ) external returns (uint256 amount0, uint256 amount1) {
        // 检查tick
        if (lowerTick >= upperTick || lowerTick < MIN_TICK || upperTick > MAX_TICK) {
            revert InvalidTickRange();
        }
        // 检查流动性数量
        if (liquidityDelta == 0) {
            revert ZeroLiquidity();
        }

        bool lowerFlipped = ticks.update(lowerTick, int128(liquidityDelta), false);
        bool upperFlipped = ticks.update(upperTick, int128(liquidityDelta), true);
        if (lowerFlipped) {
            // tickSpacing在多池子交易之前都是1
            tickBitmap.flipTick(lowerTick, 1);
        }
        if (upperFlipped) {
            tickBitmap.flipTick(upperTick, 1);
        }

        Position.Info storage position = positions.get(lpAddress, lowerTick, upperTick);
        position.update(liquidityDelta);

        Slot0 memory slot0_ = slot0;
        // 1. 价格区间高于现价，流动性只由token0组成
        if (slot0_.tick < lowerTick) {
            amount0 = Math.calcAmount0Delta(
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
                liquidityDelta
            );
            amount1 = 0;
        }
            // 2.价格区间包含现价，流动性由token0和token1组成，并且两种token的价格和现价成比例
        else if (slot0_.tick < upperTick) {
            amount0 = Math.calcAmount0Delta(
                slot0_.sqrtPriceX96,
                TickMath.getSqrtRatioAtTick(upperTick),
                liquidityDelta
            );
            amount1 = Math.calcAmount1Delta(
                slot0_.sqrtPriceX96,
                TickMath.getSqrtRatioAtTick(lowerTick),
                liquidityDelta
            );
            liquidity = LiquidityMath.addLiquidity(liquidity, int128(liquidityDelta));
        }
            // 3. 价格区间低于现价，流动性只由token1组成
        else {
            amount0 = 0;
            amount1 = Math.calcAmount1Delta(
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
                liquidityDelta
            );
        }

        uint256 balance0Before;
        uint256 balance1Before;
        if (amount0 > 0) {
            balance0Before = balance0();
        }
        if (amount1 > 0) {
            balance1Before = balance1();
        }

        IUniswapV3MintCallback(msg.sender).uniswapV3MintCallback(amount0, amount1, data);

        if (amount0 > 0 && balance0Before + amount0 < balance0()) {
            revert InsufficientInputAmount();
        }
        if (amount1 > 0 && balance1Before + amount1 < balance1()) {
            revert InsufficientInputAmount();
        }

        emit Mint(msg.sender, lpAddress, lowerTick, upperTick, liquidityDelta, amount0, amount1);
        console.log("emit mint event");
    }

    /**
     * @param recipient 从池子里面提出的token的接受地址
     * @param zeroForOne 交易方向true表示输入token0，输出token1，反之亦然
     * @param amountSpecified 用户要卖出的token数量
     */
    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountSpecified,
        uint160 sqrtPriceLimitX96, // 交易中止的价格
        bytes calldata data
    ) public returns (int256 amount0, int256 amount1) {
        // gas优化，缓存经常要读取的数据
        Slot0 memory slot0_ = slot0;
        uint128 liquidity_ = liquidity;

        if (zeroForOne) {
            if (slot0_.sqrtPriceX96 < sqrtPriceLimitX96 || sqrtPriceLimitX96 < TickMath.MIN_SQRT_RATIO) {
                revert InvalidPriceLimit();
            }
        } else {
            if (sqrtPriceLimitX96 < slot0_.sqrtPriceX96 || sqrtPriceLimitX96 > TickMath.MAX_SQRT_RATIO) {
                revert InvalidPriceLimit();
            }
        }

        // swap之前初始化一个SwapState实例
        SwapState memory state = SwapState({
            amountSpecifiedRemaining: amountSpecified,
            amountCalculated: 0,
            sqrtPriceX96: slot0_.sqrtPriceX96,
            tick: slot0_.tick,
            liquidity: liquidity_
        });

        // 循环处理完用户要卖出的所有token
        while (state.amountSpecifiedRemaining > 0 && state.sqrtPriceX96 != sqrtPriceLimitX96) {
            StepState memory step;
            step.sqrtPriceStartX96 = state.sqrtPriceX96;
            (step.nextTick, step.initialized) = tickBitmap.nextInitializedTickWithinOneWord(state.tick, 1, zeroForOne);
            step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.nextTick);


            uint160 sqrtPriceTargetX96;
            if (zeroForOne) {
                if (step.sqrtPriceNextX96 < sqrtPriceLimitX96) {
                    sqrtPriceTargetX96 = sqrtPriceLimitX96;
                } else {
                    sqrtPriceTargetX96 = step.sqrtPriceNextX96;
                }
            } else {
                if (step.sqrtPriceNextX96 > sqrtPriceLimitX96) {
                    sqrtPriceTargetX96 = sqrtPriceLimitX96;
                } else {
                    sqrtPriceTargetX96 = step.sqrtPriceNextX96;
                }
            }

            (state.sqrtPriceX96, step.amountIn, step.amountOut) = SwapMath.computeSwapStep(
                step.sqrtPriceStartX96,
                sqrtPriceTargetX96,
                liquidity,
                state.amountSpecifiedRemaining
            );

            state.amountSpecifiedRemaining -= step.amountIn;
            state.amountCalculated += step.amountOut;

            // tick移动
            if (state.sqrtPriceX96 == step.sqrtPriceNextX96) {
                // 第一次跨进区间
                if (step.initialized) {
                    int128 liquidityDelta = ticks.cross(step.nextTick);
                    if (zeroForOne) {
                        liquidityDelta = - liquidityDelta;
                    }
                    state.liquidity = LiquidityMath.addLiquidity(state.liquidity, liquidityDelta);
                    if (state.liquidity == 0) {
                        revert NotEnoughLiquidity();
                    }
                }
                state.tick = zeroForOne ? step.nextTick - 1 : step.nextTick;
            } else {
                state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);
            }
        }

        // tick移动，更新合约状态tick为最新的提供流动性的tick
        if (state.tick != slot0_.tick) {
            (slot0.sqrtPriceX96, slot0.tick) = (state.sqrtPriceX96, state.tick);
        }

        // 循环之后更新池子的流动性
        if (liquidity_ != state.liquidity) {
            liquidity = state.liquidity;
        }

        // amount0和amount1对池子来说的，对trader来说正好相反
        if (zeroForOne) {
            amount0 = int256(amountSpecified - state.amountSpecifiedRemaining);
            amount1 = - int256(state.amountCalculated);
        } else {
            amount0 = - int256(state.amountCalculated);
            amount1 = int256(amountSpecified - state.amountSpecifiedRemaining);
        }

        if (zeroForOne) {
            // 从池子里面转amount1给用户
            IERC20(token1).transfer(recipient, uint256(- amount1));
            uint256 poolBalance0Before = balance0();
            // 用户转amount0给池子
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
            // 检查用户转入的amount0
            if (balance0() < poolBalance0Before + uint(amount0)) {
                revert InsufficientInputAmount();
            }
        } else {
            // 从池子里面转amount0给用户
            IERC20(token0).transfer(recipient, uint256(- amount0));
            uint256 poolBalance1Before = balance1();
            // 用户转amount1给池子
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
            // 检查用户转入的amount1
            if (balance1() < poolBalance1Before + uint(amount1)) {
                revert InsufficientInputAmount();
            }
        }
        emit Swap(
            msg.sender,
            recipient,
            amount0,
            amount1,
            slot0.sqrtPriceX96,
            liquidity,
            slot0.tick
        );
    }

    function flash(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) public {
        uint256 balance0Before = IERC20(token0).balanceOf(address(this));
        uint256 balance1Before = IERC20(token1).balanceOf(address(this));
        if (amount0 > 0) {
            IERC20(token0).transfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            IERC20(token1).transfer(msg.sender, amount1);
        }

        IUniswapV3FlashCallback(msg.sender).uniswapV3FlashCallback(data);

        require(IERC20(token0).balanceOf(address(this)) >= balance0Before);
        require(IERC20(token1).balanceOf(address(this)) >= balance1Before);

        emit Flash(msg.sender, amount0, amount1);
    }

    function balance0() internal returns (uint256 balance) {
        balance = IERC20(token0).balanceOf(address(this));
    }

    function balance1() internal returns (uint256 balance) {
        balance = IERC20(token1).balanceOf(address(this));
    }

}
