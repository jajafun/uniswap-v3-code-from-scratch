const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {AbiCoder, parseEther} = require("ethers");

let signers, accounts, ownerSigner, ownerAccount, lpSigner, lpAccount, traderSigner, traderAccount;
let token0, token1, token0Account, token1Account;
let testUtils, pool, poolAccount, manager, managerAccount;

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
            const amount1 = parseEther("42")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(5004);
                await manager.connect(traderSigner).swap(poolAccount, false, amount1, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-0.008396874645169943"));
                assert.equal(amount1Delta, amount1);

                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                    traderBalance0: traderBalance0Before - amount0Delta,
                    traderBalance1: traderBalance1Before - amount1Delta,
                    poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                    poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                    sqrtPriceX96: "5604415652688968742392013927525", // 1 ETH = 5003.8180249710795 USDC
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
            const amount1 = parseEther("42")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(5002);
                await manager.connect(traderSigner).swap(poolAccount, false, amount1, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-0.008398516982770993"));
                assert.equal(amount1Delta, amount1);

                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5603319704133145322707074461607",
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
            const amount1 = parseEther("10000")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(6101);
                await manager.connect(traderSigner).swap(poolAccount, false, amount1, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-1.829600026831158011")); // todo -1.820694594787485635
                assert.equal(amount1Delta, amount1);
                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "6124104020255140800612189545211",  // todo 6190476002219365604851182401841
                        tick: "86957", // todo 87173
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
            const amount1 = parseEther("10000")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(6056);
                await manager.connect(traderSigner).swap(poolAccount, false, amount1, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, parseEther("-1.829600026831158012")); // todo -1.864220641170389178
                assert.equal(amount1Delta, amount1);
                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "6124104020255140800612189545211",  // todo 6165345094827913637987008642386
                        tick: "86957", // todo 87091
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
            const amount0 = parseEther("0.01337")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(4993);
                await manager.connect(traderSigner).swap(poolAccount, true, amount0, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amount0);
                assert.equal(amount1Delta, parseEther("-66.807123823853842027"));
                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5598737223630966236662554421688", // 1 ETH = 4993.683362269102 USDC
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
            const amount0 = parseEther("0.01337")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(4996);
                await manager.connect(traderSigner).swap(poolAccount, true, amount0, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amount0);
                assert.equal(amount1Delta, parseEther("-66.827918929906650442"));
                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5600479946976371527693873969480", //
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
            const amount0 = parseEther("2")
            before(async function () {
                traderBalance0Before = await token0.balanceOf(traderAccount);
                traderBalance1Before = await token1.balanceOf(traderAccount);
                const sqrtPLimitX96 = await testUtils.sqrtP(4094);
                await manager.connect(traderSigner).swap(poolAccount, true, amount0, sqrtPLimitX96, encodedData());
                const filter = pool.filters.Swap;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const amount0Delta = swapEvent.args[2];
                const amount1Delta = swapEvent.args[3];
                assert.equal(amount0Delta, amount0);
                assert.equal(amount1Delta, parseEther("-9147.666574242525959797")); // todo 9103.264925902176327184
                await assertSwapState({
                        pool,
                        token0,
                        token1,
                    },
                    {
                        traderBalance0: traderBalance0Before - amount0Delta,
                        traderBalance1: traderBalance1Before - amount1Delta,
                        poolBalance0: poolBalance.poolBalance0 + amount0Delta,
                        poolBalance1: poolBalance.poolBalance1 + amount1Delta,
                        sqrtPriceX96: "5124825090282309270942206969440", // todo 5069962753257045266417033265661
                        tick: "83394", // todo 83179
                        currentLiquidity: await liquidity(mintParamsArr[1], currentPrice)
                    });
            })
        })
    })

})

async function mintParams(lowerPrice, upperPrice, amount0, amount1) {
    const lowerTick = await testUtils.tick(lowerPrice);
    const upperTick = await testUtils.tick(upperPrice);
    return {
        poolAddress: "0x0",
        lowerTick,
        upperTick,
        amount0Desired: parseEther(amount0),
        amount1Desired: parseEther(amount1),
        amount0Min: 0,
        amount1Min: 0
    }
}

function encodedData() {
    const data = {
        token0: token0Account,
        token1: token1Account,
        payer: traderAccount
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
    ownerAccount = accounts[0];
    lpSigner = signers[5];
    lpAccount = accounts[5];
    traderSigner = signers[6];
    traderAccount = accounts[6];

    // 部署WETH和USDC合约
    token0 = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAccount]);
    token1 = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAccount]);
    token0Account = token0.target;
    token1Account = token1.target;

    // 初始化lp和trader的token余额
    await token0.mint(lpAccount, params.lpToken0Balance);
    await token1.mint(lpAccount, params.lpToken1Balance);
    await token0.mint(traderAccount, params.traderToken0Balance);
    await token1.mint(traderAccount, params.traderToken1Balance);

    // 部署WETH/USDC池子合约
    const currentSqrtP = await testUtils.sqrtP(params.currentPrice);
    const currentTick = await testUtils.tick(params.currentPrice);
    pool = await ethers.deployContract("UniswapV3Pool",
        [token0Account, token1Account, currentSqrtP, currentTick]);
    poolAccount = pool.target;

    // 部署管理合约
    manager = await ethers.deployContract("UniswapV3Manager");
    managerAccount = manager.target;

    // lp和trader批准manager一定数量的token
    await token0.connect(lpSigner).approve(managerAccount, params.lpToken0Balance);
    await token1.connect(lpSigner).approve(managerAccount, params.lpToken1Balance);
    await token0.connect(traderSigner).approve(managerAccount, params.traderToken0Balance);
    await token1.connect(traderSigner).approve(managerAccount, params.traderToken1Balance);

    // 提供流动性
    const mintParamsArr = params.mintParamsArr;
    for (let i = 0; i < mintParamsArr.length; i++) {
        const mintParams = mintParamsArr[i];
        mintParams.poolAddress = poolAccount;
        await manager.connect(lpSigner).mint(mintParams);
    }

    let poolBalance0 = BigInt(0);
    let poolBalance1 = BigInt(0);
    const filter = pool.filters.Mint;
    const events = await pool.queryFilter(filter, 0);
    events.forEach((e) => {
        poolBalance0 += e.args[e.args.length - 2]
        poolBalance1 += e.args[e.args.length - 1]
    })

    return {poolBalance0, poolBalance1};
}

async function assertSwapState(contracts, expected) {
    // trader's token0Balance
    assert.equal(
        await contracts.token0.balanceOf(traderAccount),
        expected.traderBalance0
    )
    // trader's token1Balance
    assert.equal(
        await contracts.token1.balanceOf(traderAccount),
        expected.traderBalance1
    )
    // pool's token0Balance
    assert.equal(
        await contracts.token0.balanceOf(poolAccount),
        expected.poolBalance0
    )
    // pool's token1Balance
    assert.equal(
        await contracts.token1.balanceOf(poolAccount),
        expected.poolBalance1
    )

    const slot0 = await pool.slot0();
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
    assert.equal(
        await pool.liquidity(),
        expected.currentLiquidity
    )
}
