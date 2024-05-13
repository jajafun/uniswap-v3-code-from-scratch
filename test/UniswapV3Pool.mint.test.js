const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {parseEther, AbiCoder, keccak256, solidityPacked} = ethers;

let signers, accounts, ownerSigner, ownerAccount, lpSigner, lpAccount;
let token0, token1, token0Account, token1Account;
let testUtils, pool, poolAccount, manager, managerAccount;

describe("UniswapV3Pool mint tests", function () {
    before(async () => {
        // 部署计算测试数据的合约
        testUtils = await ethers.deployContract("TestUtils");
    })

    //          5000
    // 4545 -----|----- 5500
    describe("mint range including current price", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
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
            assert.equal(poolBalance.poolBalance0, parseEther("0.998995580131581600"));
            assert.equal(poolBalance.poolBalance1, parseEther("4999.999999999999999999"))
        });

        it("mint state", async function () {
            await assetMintState({
                pool,
                token0,
                token1
            },{
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1,
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                positionLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                currentLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice)
            })
        })
    })

    //             5000
    //             |---------
    // 4545 ------4999
    describe("mint range below current price ", function () {
        let currentPrice = "5000";
        let poolBalance;
        const mintParamsArr = [];
        before(async function () {
            const mintParams0 = await mintParams(4545, 4999, "1", currentPrice);
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
            assert.equal(poolBalance.poolBalance0, parseEther("0"));
            assert.equal(poolBalance.poolBalance1, parseEther("4999.999999999999999997"))
        });

        it("mint state", async function () {
            await assetMintState({
                pool,
                token0,
                token1
            },{
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1,
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                positionLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                currentLiquidity: 0,
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice)
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
        before(async function () {
            const mintParams0 = await mintParams(5001, 6250, "1", currentPrice);
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
            assert.equal(poolBalance.poolBalance0, parseEther("1"));
            assert.equal(poolBalance.poolBalance1, parseEther("0"))
        });

        it("mint state", async function () {
            await assetMintState({
                pool,
                token0,
                token1
            },{
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1,
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                positionLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                currentLiquidity: 0,
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice)
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
            assert.equal(poolBalance.poolBalance0, parseEther("1.748692227462822454"));
            assert.equal(poolBalance.poolBalance1, parseEther("8749.999999999999999999"))
        });

        it("mint state", async function () {
            await assetMintState({
                pool,
                token0,
                token1
            },{
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1,
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                positionLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                currentLiquidity: await liquidity(mintParamsArr[0], currentPrice) + await liquidity(mintParamsArr[1], currentPrice),
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice)
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
            assert.equal(poolBalance.poolBalance0, parseEther("1.498995580131581600"));
            assert.equal(poolBalance.poolBalance1, parseEther("8749.999999999999999993"))
        });

        it("mint state", async function () {
            await assetMintState({
                pool,
                token0,
                token1
            },{
                poolBalance0: poolBalance.poolBalance0,
                poolBalance1: poolBalance.poolBalance1,
                lowerTick: mintParamsArr[0].lowerTick,
                upperTick: mintParamsArr[0].upperTick,
                positionLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                currentLiquidity: await liquidity(mintParamsArr[0], currentPrice),
                sqrtPriceX96: await testUtils.sqrtP(currentPrice),
                tick: await testUtils.tick(currentPrice)
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

async function setup(params) {
    signers = await ethers.getSigners();
    accounts = signers.map((x) => x.address);
    ownerSigner = signers[0];
    ownerAccount = accounts[0];
    lpSigner = signers[5];
    lpAccount = accounts[5];

    // 部署WETH和USDC合约
    token0 = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAccount]);
    token1 = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAccount]);
    token0Account = token0.target;
    token1Account = token1.target;

    // 初始化lp和trader的token余额
    await token0.mint(lpAccount, params.lpToken0Balance);
    await token1.mint(lpAccount, params.lpToken1Balance);

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


async function assetMintState(contracts, expected) {
    // pool's balance0
    assert.equal(
        await contracts.token0.balanceOf(poolAccount),
        expected.poolBalance0
    );

    // pool's balance1
    assert.equal(
        await contracts.token1.balanceOf(poolAccount),
        expected.poolBalance1
    )

    // pool's position liquidity
    const positionKey = keccak256(solidityPacked(
        ["address", "int24", "int24"],
        [lpAccount, expected.lowerTick, expected.upperTick]
    ));
    const positionLiquidity = await contracts.pool.positions(positionKey);
    assert.equal(positionLiquidity, expected.positionLiquidity);

    // lower tick info
    const lowTickInfo = await contracts.pool.ticks(expected.lowerTick);
    assert.equal(lowTickInfo[0], true);
    assert.equal(lowTickInfo[1], expected.positionLiquidity);
    assert.equal(lowTickInfo[2], expected.positionLiquidity);

    // upper tick info
    const upperTickInfo = await contracts.pool.ticks(expected.upperTick);
    assert.equal(upperTickInfo[0], true);
    assert.equal(upperTickInfo[1], expected.positionLiquidity);
    assert.equal(upperTickInfo[2], -expected.positionLiquidity);

    // tick bit map
    assert.equal(
        await tickBitmap(contracts.pool, expected.lowerTick),
        true
    );
    assert.equal(
        await tickBitmap(contracts.pool, expected.upperTick),
        true
    );

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

    // current liquidity
    assert.equal(
        await contracts.pool.liquidity(),
        expected.currentLiquidity
    );
}


async function tickBitmap(pool, tick) {
    const wordPos = tick >> 8n;
    const word = await pool.tickBitmap(wordPos);

    let bitPos = tick % 256n;
    bitPos = bitPos < 0 ? -bitPos : bitPos;

    return (word & (1n << BigInt(bitPos))) !== 0n;
}


