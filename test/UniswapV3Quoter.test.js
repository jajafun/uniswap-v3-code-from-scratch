const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {AbiCoder, parseEther} = require("ethers");

describe("UniswapV3Quotor", () => {
    let testUtils;
    let token0, token1, pool, manager, quoter;
    let token0Account, token1Account, poolAccount, managerAccount, quoterAccount;
    let signers, ownerSigner, lpSigner, traderSigner;
    let accounts, ownerAccount, lpAccount, traderAccount;

    let lpToken0Balance = parseEther("100");
    let lpToken1Balance = parseEther("1000000");
    let traderToken0Balance = parseEther("100");
    let traderToken1Balance = parseEther("1000000");

    let lowerTick = "84222";
    let upperTick = "86129";

    before(async function () {
        signers = await ethers.getSigners();
        accounts = signers.map((x) => x.address);
        ownerSigner = signers[0];
        ownerAccount = accounts[0];
        lpSigner = signers[5];
        lpAccount = accounts[5];
        traderSigner = signers[6];
        traderAccount = accounts[6];
        testUtils = await ethers.deployContract("TestUtils");
        token0 = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAccount]);
        token1 = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAccount]);
        token0Account = token0.target;
        token1Account = token1.target;
        await token0.mint(lpAccount, lpToken0Balance);
        await token1.mint(lpAccount, lpToken1Balance);
        await token0.mint(traderAccount, traderToken0Balance);

        let currentSqrtP = await testUtils.sqrtP("5000");
        let currentTick = await testUtils.tick("5000");
        pool = await ethers.deployContract("UniswapV3Pool", [token0Account, token1Account, currentSqrtP, currentTick]);
        manager = await ethers.deployContract("UniswapV3Manager");
        poolAccount = pool.target;
        managerAccount = manager.target;

        await token0.connect(lpSigner).approve(managerAccount, lpToken0Balance);
        await token1.connect(lpSigner).approve(managerAccount, lpToken1Balance);
        await token0.connect(traderSigner).approve(managerAccount, traderToken0Balance);
        await token1.connect(traderSigner).approve(managerAccount, traderToken1Balance);

        await manager.connect(lpSigner).mint({
            poolAddress: poolAccount,
            lowerTick,
            upperTick,
            amount0Desired: lpToken0Balance,
            amount1Desired: lpToken1Balance,
            amount0Min: 0,
            amount1Min: 0
        });

        quoter = await ethers.deployContract("UniswapV3Quoter");
        quoterAccount = quoter.target;
    })

    it("quote USDC when trader sell WETH", async function () {
        const quote = await quoter.quote.staticCall({
            poolAddress: poolAccount,
            amountIn: parseEther("0.01337"),
            sqrtPriceLimitX96: await testUtils.sqrtP(4993),
            zeroForOne: true
        })
        assert.equal(quote[0], parseEther("66.848311115829095436"));
        assert.equal(quote[1], "5602188903804032936080843843002");
        assert.equal(quote[2], "85175")
    })

    it("quote WETH when trader sell USDC", async function () {
        const quote = await quoter.quote.staticCall({
            poolAddress: poolAccount,
            amountIn: parseEther("42"),
            sqrtPriceLimitX96: await testUtils.sqrtP(5005),
            zeroForOne: false
        })
        assert.equal(quote[0], parseEther("0.008400127130052481"));
        assert.equal(quote[1], "5602223755577321903022134995689");
        assert.equal(quote[2], "85176")
    })

    it("quote and swap USDC for WETH", async function () {
        const sqrtPriceLimitX96 = await testUtils.sqrtP(4993);
        const amountIn = parseEther("0.01337");
        const quote = await quoter.quote.staticCall({
            poolAddress: poolAccount,
            amountIn: amountIn,
            sqrtPriceLimitX96,
            zeroForOne: true
        });
        const amountOut = quote[0];
        const data = {
            token0: token0Account,
            token1: token1Account,
            payer: traderAccount
        }
        const types = ["address", "address", "address"];
        let dataEncoded = AbiCoder.defaultAbiCoder().encode(types, [data.token0, data.token1, data.payer]);
        await manager.connect(traderSigner).swap(poolAccount, true, amountIn,  sqrtPriceLimitX96, dataEncoded);
        const filter = pool.filters.Swap;
        const events = await pool.queryFilter(filter, -1);
        const swapEvent = events[0];
        assert.equal(swapEvent.args[2], amountIn);
        assert.equal(-swapEvent.args[3], amountOut);
    })

    it("quote and swap ETH for USDC", async function () {
        const sqrtPriceLimitX96 = await testUtils.sqrtP(5010);

        const amountIn = parseEther("55")
        const quote = await quoter.quote.staticCall({
            poolAddress: poolAccount,
            amountIn: amountIn,
            sqrtPriceLimitX96,
            zeroForOne: false
        });
        const amountOut = quote[0];

        const data = {
            token0: token0Account,
            token1: token1Account,
            payer: traderAccount
        }
        const types = ["address", "address", "address"];
        let dataEncoded = AbiCoder.defaultAbiCoder().encode(types, [data.token0, data.token1, data.payer]);
        await manager.connect(traderSigner).swap(poolAccount, false, amountIn, sqrtPriceLimitX96, dataEncoded);
        const filter = pool.filters.Swap;
        const events = await pool.queryFilter(filter, -1);
        const swapEvent = events[1];
        assert.equal(-swapEvent.args[2], amountOut);
        assert.equal(swapEvent.args[3], amountIn);
    })
})
