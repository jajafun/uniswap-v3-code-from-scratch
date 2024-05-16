const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {AbiCoder, parseEther} = require("ethers");

let signers, accounts, ownerSigner, ownerAddress, lpSigner, lpAddress, traderSigner, traderAddress;
let token0, token1, token0Address, token1Address;
let testUtils, factory, factoryAddress, wethUsdcPool, wethUsdcPoolAddress, manager, managerAddress;

const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";


describe("UniswapV3Pool swap tests", () => {
    before(async () => {
        // 部署计算测试数据的合约
        testUtils = await ethers.deployContract("TestUtils");
    })

    /*
                 5000
        4545 -----|----- 5500
    */
    describe("WETH <= USDC one price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            mintParamsArr.push(mintParams0);
            const params = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                traderToken0Balance: parseEther("1"),
                traderToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange USDC to ETH ", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("42")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(5004);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token1Address,
                    tokenOutAddress: token0Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-0.008371754005882864"));
                assert.equal(amount1Delta, amountIn);

                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                    traderBalance0: traderBalance0Before - amount0Delta,
                    traderBalance1: traderBalance1Before - amount1Delta,
                    poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                    poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                    sqrtPriceX96: "5604368801926411075902760472621", // 1 ETH = 5003.8180249710795 USDC
                    tick: "85183",
                    currentLiquidity: await liquidity(mintParamsArr[0], currentPrice)
                });
            })
        })
    })

    /*
                 5000
        4545 -----|----- 5500
        4545 -----|----- 5500
    */
    describe("WETH <= USDC two equal price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams0);
            const params = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                traderToken0Balance: parseEther("2"),
                traderToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange USDC to ETH ", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("42")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(5002);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token1Address,
                    tokenOutAddress: token0Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-0.008373356437690182"));
                assert.equal(amount1Delta, amountIn);

                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5603296278751866489462447734155",
                        tick: "85179",
                        currentLiquidity: await liquidity(mintParamsArr[0], currentPrice) + await liquidity(mintParamsArr[0], currentPrice)
                    });
            })
        })
    })

    /*
                 5000
        4545 -----|----- 5500
                   5500 ---------- 6250
    */
    describe("WETH <= USDC consecutive price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            const mintParams1 = await mintParams(5500, 6250,  "1", "5000");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams1);
            const params = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                traderToken0Balance: parseEther("2"),
                traderToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange USDC to ETH", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("10000")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(6106);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token1Address,
                    tokenOutAddress: token0Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-1.827439875060129977"));
                assert.equal(amount1Delta, amountIn);
                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "6112949076789029731742069103605",
                        tick: "86921",
                        currentLiquidity: await liquidity(mintParamsArr[1], currentPrice)
                    });
            })
        })
    })

    /*
                 5000
        4545 -----|----- 5500
              5001 ---------- 6250
    */
    describe("WETH <= USDC partially overlapping price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            const mintParams1 = await mintParams(5001, 6250,  "1", "5000");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams1);
            const params = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                traderToken0Balance: parseEther("2"),
                traderToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange USDC to ETH", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("10000")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(6056);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token1Address,
                    tokenOutAddress: token0Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-1.827439875060129977"));
                assert.equal(amount1Delta, amountIn);
                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "6112949076789029731742069103605",
                        tick: "86921",
                        currentLiquidity: await liquidity(mintParamsArr[1], currentPrice)
                    });
            })
        })
    })

    /*
             5000
    4545 -----|----- 5500
*/
    describe("WETH => USDC one price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            mintParamsArr.push(mintParams0);
            const params = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                traderToken0Balance: parseEther("1"),
                traderToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange ETH to USDC", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("0.01337")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(4993);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token0Address,
                    tokenOutAddress: token1Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amountIn);
                assert.equal(amount1Delta, parseEther("-66.607588492545060572"));
                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5598811701211424979240405511481", // 1 ETH = 4993.683362269102 USDC
                        tick: "85163",
                        currentLiquidity: await liquidity(mintParamsArr[0], currentPrice)
                    });
            })
        })
    })

    /*
                 5000
        4545 -----|----- 5500
        4545 -----|----- 5500
    */
    describe("WETH => USDC two equal price range", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams0);
            const params = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                traderToken0Balance: parseEther("2"),
                traderToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange ETH to USDC", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("0.01337")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(4996);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token0Address,
                    tokenOutAddress: token1Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amountIn);
                assert.equal(amount1Delta, parseEther("-66.627878466092114258"));
                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5600517208705142889674469554592", //
                        tick: "85169",
                        currentLiquidity: await liquidity(mintParamsArr[0], currentPrice) + await liquidity(mintParamsArr[1], currentPrice)
                    });
            })
        })
    })

    /*
                            5000
                   4545 -----|----- 5500
        4000 -----|----- 4545
    */
    describe("WETH => USDC consecutive price ranges", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500,  "1", "5000");
            const mintParams1 = await mintParams(4000, 4545,  "1", "5000");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams1);
            const params = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                traderToken0Balance: parseEther("2"),
                traderToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after exchange ETH to USDC", async function () {
            let traderBalance0Before, traderBalance1Before;
            let swapEvent;
            const amountIn = parseEther("2")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAddress);
                traderBalance1Before = await token1.balanceOf(traderAddress);
                const sqrtPriceLimitX96 = await testUtils.sqrtP(4094);
                await manager.connect(traderSigner).swapSingle({
                    tokenInAddress: token0Address,
                    tokenOutAddress: token1Address,
                    fee: 3000,
                    amountIn,
                    sqrtPriceLimitX96,
                });
                const filter = wethUsdcPool.filters.Swap;
                const events = await wethUsdcPool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amountIn);
                assert.equal(amount1Delta, parseEther("-9136.865918765937432094"));
                await assertSwapState({
                        wethUsdcPool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5134176736396776329918284690650",
                        tick: "83431",
                        currentLiquidity: await liquidity(mintParamsArr[1], currentPrice)
                    });
            })
        })
    })

})

async function mintParams(lowerPrice, upperPrice, amount0, amount1) {
    const lowerTick = await testUtils.tick60(lowerPrice);
    const upperTick = await testUtils.tick60(upperPrice);
    return {
        token0Address: token0Address,
        token1Address: token1Address,
        fee: 3000,
        lowerTick: lowerTick,
        upperTick: upperTick,
        amount0Desired: parseEther(amount0),
        amount1Desired: parseEther(amount1),
        amount0Min: 0,
        amount1Min: 0
    }
}

function encodedData() {
    const data = {
        token0: token0Address,
        token1: token1Address,
        payer: traderAddress
    }
    const types = ["address", "address", "address"];
    return AbiCoder.defaultAbiCoder().encode(types, [data.token0, data.token1, data.payer]);
}

async function liquidity(mintParams, currentPrice) {
    return await testUtils.getLiquidityForAmounts(
        await testUtils.sqrtP(currentPrice),
        await testUtils.getSqrtRatioAtTick(mintParams.lowerTick),
        await testUtils.getSqrtRatioAtTick(mintParams.upperTick),
        mintParams.amount0Desired,
        mintParams.amount1Desired
    )
}

async function setup(params) {
    signers = await ethers.getSigners();
    accounts = signers.map((x) => x.address);
    ownerSigner = signers[0];
    ownerAddress = accounts[0];
    lpSigner = signers[5];
    lpAddress = accounts[5];
    traderSigner = signers[6];
    traderAddress = accounts[6];

    // 部署WETH和USDC合约
    token1 = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAddress]);
    token0 = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAddress]);
    token0Address = token0.target;
    token1Address = token1.target;

    // 初始化lp和trader的token余额
    await token0.mint(lpAddress, params.lpToken0Balance);
    await token1.mint(lpAddress, params.lpToken1Balance);
    await token0.mint(traderAddress, params.traderToken0Balance);
    await token1.mint(traderAddress, params.traderToken1Balance);

    factory = await ethers.deployContract("UniswapV3Factory");
    factoryAddress = factory.target;

    await factory.createPool(token0Address, token1Address, 3000);
    const poolCreatedEvents = await factory.queryFilter(factory.filters.PoolCreated, 0);
    wethUsdcPoolAddress = poolCreatedEvents[0].args[3];

    const { abi } = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString());
    wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, abi, ethers.provider);
    await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));

    manager = await ethers.deployContract("UniswapV3Manager", [factoryAddress]);
    managerAddress = manager.target;

    // lp和trader批准manager一定数量的token
    await token0.connect(lpSigner).approve(managerAddress, params.lpToken0Balance);
    await token1.connect(lpSigner).approve(managerAddress, params.lpToken1Balance);
    await token0.connect(traderSigner).approve(managerAddress, params.traderToken0Balance);
    await token1.connect(traderSigner).approve(managerAddress, params.traderToken1Balance);

    // 提供流动性
    const mintParamsArr = params.mintParamsArr;
    for (let i = 0; i < mintParamsArr.length; i++) {
        const mintParams = mintParamsArr[i];
        mintParams.token0Address = token0Address;
        mintParams.token1Address = token1Address;
        await manager.connect(lpSigner).mint(mintParams);
    }

    let poolBalance0 = BigInt(0);
    let poolBalance1 = BigInt(0);
    const filter = wethUsdcPool.filters.Mint;
    const events = await wethUsdcPool.queryFilter(filter, 0);
    events.forEach((e) => {
        poolBalance0 += e.args[e.args.length - 2]
        poolBalance1 += e.args[e.args.length - 1]
    })

    return {poolBalance0, poolBalance1};
}

async function assertSwapState(contracts, expected) {
    // trader's token0Balance
    assert.equal(
        await contracts.token0.balanceOf(traderAddress),
        expected.traderBalance0
    )
    // trader's token1Balance
    assert.equal(
        await contracts.token1.balanceOf(traderAddress),
        expected.traderBalance1
    )
    // pool's token0Balance
    assert.equal(
        await contracts.token0.balanceOf(wethUsdcPoolAddress),
        expected.poolBalance0
    )
    // pool's token1Balance
    assert.equal(
        await contracts.token1.balanceOf(wethUsdcPoolAddress),
        expected.poolBalance1
    )

    const slot0 = await wethUsdcPool.slot0();
    // pool's sqrtPriceX96
    assert.equal(
        slot0[0],
        expected.sqrtPriceX96
    )
    // pool's tick
    assert.equal(
        slot0[1],
        expected.tick
    )
    // pool's liquidity
    // assert.equal(
    //     await wethUsdcPool.liquidity(),
    //     expected.currentLiquidity
    // )
}
