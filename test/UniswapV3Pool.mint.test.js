const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {min} = require("hardhat/internal/util/bigint");
const {parseEther, AbiCoder, keccak256, solidityPacked} = ethers;

let signers, accounts, ownerSigner, ownerAddress, lpSigner, lpAddress;
let weth, usdc, wethAddress, usdcAddress;
let testUtils, factory, factoryAddress, wethUsdcPool, wethUsdcPoolAddress, pool, poolAddress, manager, managerAddress;

const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";

describe("UniswapV3Pool mint tests", function () {
    before(async () => {
        testUtils = await ethers.deployContract("TestUtils");
    })

    //          5000
    // 4545 -----|----- 5500
    describe("mint range including current price", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        const expectedAmount0 = parseEther("0.987492179736600509");
        const expectedAmount1 = parseEther("4999.999999999999999999");
        before(async function () {
            const mintParams0 = await mintParams(4545, 5500, "1", currentPrice);
            mintParamsArr.push(mintParams0);
            const setupParams = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr,
            }
            poolBalance = await setup(setupParams);
            console.log(poolBalance)
        })

        it("pool balances", function () {
            assert.equal(poolBalance.poolBalance0, expectedAmount0);
            assert.equal(poolBalance.poolBalance1, expectedAmount1);
        });

        it("mint state", async function () {
            await assertPoolState({
                pool: wethUsdcPool
            }, {
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice),
                fees: [0, 0]
            });

            await assertBalances({
                token0: weth,
                token1: usdc
            }, {
                userBalance0: parseEther("1") - expectedAmount0,
                userBalance1: parseEther("5000") - expectedAmount1,
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1
            });

            await assertPosition({
                pool: wethUsdcPool
            }, {
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                liquidity: await liquidity(mintParamsArr[0], currentPrice),
                feeGrowthInside0LastX128: 0,
                feeGrowthInside1LastX128: 0,
                tokensOwed0: 0,
                tokensOwed1: 0
            });

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].lowerTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: await liquidity(mintParamsArr[0], currentPrice)
            })

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].upperTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: -(await liquidity(mintParamsArr[0], currentPrice))
            })

            await assertObservation({
                pool: wethUsdcPool
            }, {
                index: 0,
                timestamp: 1,
                tickCumulative: 0,
                initialized: true
            })
        })
    })

    //             5000
    //             |---------
    // 4545 ------4996
    describe("mint range below current price ", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        const expectedAmount0 = parseEther("0");
        const expectedAmount1 = parseEther("4999.999999999999999994");
        before(async function () {
            const mintParams0 = await mintParams(4000, 4996, "1", currentPrice);
            mintParamsArr.push(mintParams0);
            const setupParams = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr,
            }
            poolBalance = await setup(setupParams);
        })

        it("pool balances", function () {
            assert.equal(poolBalance.poolBalance0, expectedAmount0);
            assert.equal(poolBalance.poolBalance1, expectedAmount1)
        });

        it("mint state", async function () {
            await assertPoolState({
                pool: wethUsdcPool
            }, {
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice),
                fees: [0, 0]
            });

            await assertBalances({
                token0: weth,
                token1: usdc
            }, {
                userBalance0: parseEther("1") - expectedAmount0,
                userBalance1: parseEther("5000") - expectedAmount1,
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1
            });

            await assertPosition({
                pool: wethUsdcPool
            }, {
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                liquidity: await liquidity(mintParamsArr[0], currentPrice),
                feeGrowthInside0LastX128: 0,
                feeGrowthInside1LastX128: 0,
                tokensOwed0: 0,
                tokensOwed1: 0
            });

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].lowerTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: await liquidity(mintParamsArr[0], currentPrice)
            })

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].upperTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: -(await liquidity(mintParamsArr[0], currentPrice))
            })

            await assertObservation({
                pool: wethUsdcPool
            }, {
                index: 0,
                timestamp: 1,
                tickCumulative: 0,
                initialized: true
            })
        })
    })

    //         5000
    // ---------|
    //       5001 ---------- 6250
    describe("mint range above current price ", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        const expectedAmount0 = parseEther("1");
        const expectedAmount1 = parseEther("0");
        before(async function () {
            const mintParams0 = await mintParams(5027, 6250, "1", currentPrice);
            mintParamsArr.push(mintParams0);
            const setupParams = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr,
            }
            poolBalance = await setup(setupParams);
        })

        it("pool balances", function () {
            assert.equal(poolBalance.poolBalance0, expectedAmount0);
            assert.equal(poolBalance.poolBalance1, expectedAmount1)
        });

        it("mint state", async function () {
            await assertPoolState({
                pool: wethUsdcPool
            }, {
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice),
                fees: [0, 0]
            });

            await assertBalances({
                token0: weth,
                token1: usdc
            }, {
                userBalance0: parseEther("1") - expectedAmount0,
                userBalance1: parseEther("5000") - expectedAmount1,
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1
            });

            await assertPosition({
                pool: wethUsdcPool
            }, {
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                liquidity: await liquidity(mintParamsArr[0], currentPrice),
                feeGrowthInside0LastX128: 0,
                feeGrowthInside1LastX128: 0,
                tokensOwed0: 0,
                tokensOwed1: 0
            });

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].lowerTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: await liquidity(mintParamsArr[0], currentPrice)
            })

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].upperTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: -(await liquidity(mintParamsArr[0], currentPrice))
            })

            await assertObservation({
                pool: wethUsdcPool
            }, {
                index: 0,
                timestamp: 1,
                tickCumulative: 0,
                initialized: true
            })
        })
    })

    //              5000
    //      4545 -----|----- 5500
    // 4000 ----------|---------- 6250
    describe("mint overlapping ranges including current price ", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        const expectedAmount0 = parseEther("1.733736657972640080");
        const expectedAmount1 = parseEther("8749.999999999999999994");
        before(async function () {
            const mintParams0 = await mintParams(4545, 5500, "1", currentPrice);
            const mintParams1 = await mintParams(4000, 6250, "0.75", "3750");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams1);
            const setupParams = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr,
            }
            poolBalance = await setup(setupParams);
            console.log(poolBalance)
        })

        it("pool balances", function () {
            assert.equal(poolBalance.poolBalance0, expectedAmount0);
            assert.equal(poolBalance.poolBalance1, expectedAmount1)
        });

        it("mint state", async function () {
            await assertPoolState({
                pool: wethUsdcPool
            }, {
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice),
                fees: [0, 0]
            });

            await assertBalances({
                token0: weth,
                token1: usdc
            }, {
                userBalance0: parseEther("2") - expectedAmount0,
                userBalance1: parseEther("10000") - expectedAmount1,
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1
            });

            await assertPosition({
                pool: wethUsdcPool
            }, {
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                liquidity: await liquidity(mintParamsArr[0], currentPrice),
                feeGrowthInside0LastX128: 0,
                feeGrowthInside1LastX128: 0,
                tokensOwed0: 0,
                tokensOwed1: 0
            });

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].lowerTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: await liquidity(mintParamsArr[0], currentPrice)
            })

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].upperTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: -(await liquidity(mintParamsArr[0], currentPrice))
            })

            await assertObservation({
                pool: wethUsdcPool
            }, {
                index: 0,
                timestamp: 1,
                tickCumulative: 0,
                initialized: true
            })
        })
    })

    //              5000
    //      4545 -----|----- 5500
    // 4000 ---------4999
    //              5001--------- 6250
    describe("mint partial overlapping ranges including current price ", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        const expectedAmount0 = parseEther("1.495924438559718081");
        const expectedAmount1 = parseEther("8749.999999999999999994");
        before(async function () {
            const mintParams0 = await mintParams(4545, 5500, "1", currentPrice);
            const mintParams1 = await mintParams(4000, 4999, "0.75", "3750");
            const mintParams2 = await mintParams(5001, 6250, "0.50", "2500");
            mintParamsArr.push(mintParams0);
            mintParamsArr.push(mintParams1);
            mintParamsArr.push(mintParams2);
            const setupParams = {
                lpToken0Balance: parseEther("2"),
                lpToken1Balance: parseEther("10000"),
                currentPrice,
                mintParamsArr,
            }
            poolBalance = await setup(setupParams);
            console.log(poolBalance)
        })

        it("pool balances", function () {
            assert.equal(poolBalance.poolBalance0, expectedAmount0);
            assert.equal(poolBalance.poolBalance1, expectedAmount1)
        });

        it("mint state", async function () {
            await assertPoolState({
                pool: wethUsdcPool
            }, {
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice),
                fees: [0, 0]
            });

            await assertBalances({
                token0: weth,
                token1: usdc
            }, {
                userBalance0: parseEther("2") - expectedAmount0,
                userBalance1: parseEther("10000") - expectedAmount1,
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1
            });

            await assertPosition({
                pool: wethUsdcPool
            }, {
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                liquidity: await liquidity(mintParamsArr[0], currentPrice),
                feeGrowthInside0LastX128: 0,
                feeGrowthInside1LastX128: 0,
                tokensOwed0: 0,
                tokensOwed1: 0
            });

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].lowerTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: await liquidity(mintParamsArr[0], currentPrice)
            })

            await assertTick({
                pool: wethUsdcPool,
            }, {
                tick: mintParamsArr[0].upperTick,
                initialized: true,
                liquidityGross: await liquidity(mintParamsArr[0], currentPrice),
                liquidityNet: -(await liquidity(mintParamsArr[0], currentPrice))
            })

            await assertObservation({
                pool: wethUsdcPool
            }, {
                index: 0,
                timestamp: 1,
                tickCumulative: 0,
                initialized: true
            })
        })
    })

})

async function liquidity(mintParams, currentPrice) {
    return await testUtils.getLiquidityForAmounts(
        await testUtils.sqrtP(currentPrice),
        await testUtils.getSqrtRatioAtTick(mintParams.lowerTick),
        await testUtils.getSqrtRatioAtTick(mintParams.upperTick),
        mintParams.amount0Desired,
        mintParams.amount1Desired
    )
}

async function mintParams(lowerPrice, upperPrice, amount0, amount1) {
    const lowerTick = await testUtils.tick60(lowerPrice);
    const upperTick = await testUtils.tick60(upperPrice);
    return {
        token0Address: wethAddress,
        token1Address: usdcAddress,
        fee: 3000,
        lowerTick: lowerTick,
        upperTick: upperTick,
        amount0Desired: parseEther(amount0),
        amount1Desired: parseEther(amount1),
        amount0Min: 0,
        amount1Min: 0
    }
}

async function setup(params) {
    signers = await ethers.getSigners();
    accounts = signers.map((x) => x.address);
    lpSigner = signers[5];
    lpAddress = accounts[5];
    ownerSigner = signers[0];
    ownerAddress = accounts[0];

    usdc = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAddress]);
    weth = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAddress]);
    usdcAddress = usdc.target;
    wethAddress = weth.target;

    factory = await ethers.deployContract("UniswapV3Factory");
    factoryAddress = factory.target;

    await factory.createPool(wethAddress, usdcAddress, 3000);
    const poolCreatedEvents = await factory.queryFilter(factory.filters.PoolCreated, 0);
    wethUsdcPoolAddress = poolCreatedEvents[0].args[3];

    const { abi } = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString());
    wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, abi, ethers.provider);
    await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));

    await weth.mint(lpAddress, params.lpToken0Balance);
    await usdc.mint(lpAddress, params.lpToken1Balance);

    manager = await ethers.deployContract("UniswapV3Manager", [factoryAddress]);
    managerAddress = manager.target;

    await weth.connect(lpSigner).approve(managerAddress, params.lpToken0Balance);
    await usdc.connect(lpSigner).approve(managerAddress, params.lpToken1Balance);

    // 提供流动性
    const mintParamsArr = params.mintParamsArr;
    for (let i = 0; i < mintParamsArr.length; i++) {
        const mintParams = mintParamsArr[i];
        mintParams.token0Address = wethAddress;
        mintParams.token1Address = usdcAddress;
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

async function assertPoolState(contracts, expected) {
    // slot0
    const slot0 = await contracts.pool.slot0();
    assert.equal(
        slot0[0],
        expected.sqrtPriceX96
    );
    assert.equal(
        slot0[1],
        expected.tick
    );

    assert.equal(
        await contracts.pool.feeGrowthGlobal0X128(),
        expected.fees[0]
    );

    assert.equal(
        await contracts.pool.feeGrowthGlobal1X128(),
        expected.fees[1]
    );
}

async function assertBalances(contracts, expected) {
    assert.equal(
        await contracts.token0.balanceOf(wethUsdcPoolAddress),
        expected.poolBalance0
    );
    assert.equal(
        await contracts.token1.balanceOf(wethUsdcPoolAddress),
        expected.poolBalance1
    );
    assert.equal(
        await contracts.token0.balanceOf(lpAddress),
        expected.userBalance0
    );
    assert.equal(
        await contracts.token1.balanceOf(lpAddress),
        expected.userBalance1
    );
}

async function assertTick(contracts, expected) {
    const tick = await contracts.pool.ticks(expected.tick);

    assert.equal(
        tick[0],
        expected.initialized
    )

    assert.equal(
        tick[1],
        expected.liquidityGross
    )

    assert.equal(
        tick[2],
        expected.liquidityNet
    )
}

async function assertPosition(contracts, expected) {
    const positionKey = keccak256(solidityPacked(
        ["address", "int24", "int24"],
        [lpAddress, expected.lowerTick, expected.upperTick]
    ));
    const position = await contracts.pool.positions(positionKey);

    assert.equal(
        position[0],
        expected.liquidity
    )

    assert.equal(
        position[1],
        expected.feeGrowthInside0LastX128
    )

    assert.equal(
        position[2],
        expected.feeGrowthInside1LastX128
    )

    assert.equal(
        position[3],
        expected.tokensOwed0
    )

    assert.equal(
        position[4],
        expected.tokensOwed1
    )
}

async function assertObservation(contracts, expected) {
    const observation = await contracts.pool.observations(expected.index);

    // assert.equal(
    //     observation[0],
    //     block.timestamp
    // )

    assert.equal(
        observation[1],
        expected.tickCumulative
    )

    assert.equal(
        observation[2],
        expected.initialized
    )
}

async function tickBitmap(pool, tick) {
    const wordPos = tick >> 8n;
    const word = await pool.tickBitmap(wordPos);

    let bitPos = tick % 256n;
    bitPos = bitPos < 0 ? -bitPos : bitPos;

    return (word & (1n << BigInt(bitPos))) !== 0n;
}


