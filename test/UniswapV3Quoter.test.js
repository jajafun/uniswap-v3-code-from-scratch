const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {AbiCoder, parseEther} = require("ethers");

describe("UniswapV3Quotor", () => {
    let testUtils;
    let weth, usdc, uni, factory, wethUsdcPool, wethUniPool, manager, quoter;
    let wethAddress, usdcAddress, uniAddress, factoryAddress, wethUsdcPoolAddress, wethUniPoolAddress, managerAddress, quoterAddress;
    let signers, ownerSigner, lpSigner, traderSigner;
    let accounts, ownerAccount, lpAccount, traderAccount;

    let lpWethBalance = parseEther("100");
    let lpUsdcBalance = parseEther("1000000");
    let lpUniBalance = parseEther("1000");
    let traderWethBalance = parseEther("100");
    let traderUsdcBalance = parseEther("1000000");
    let traderUniBalance = parseEther("1000");

    const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";

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

        usdc = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAccount]);
        weth = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAccount]);
        uni = await ethers.deployContract("ERC20Mintable", ["Uniswap Coin", "UNI", ownerAccount]);
        wethAddress = weth.target;
        usdcAddress = usdc.target;
        uniAddress = uni.target;

        console.log("wethAddress", wethAddress);
        console.log("usdcAddress", usdcAddress);
        console.log("uniAddress", uniAddress);

        factory = await ethers.deployContract("UniswapV3Factory");
        factoryAddress = factory.target;

        await factory.createPool(wethAddress, usdcAddress, 3000);
        await factory.createPool(wethAddress, uniAddress, 3000);

        const events = await factory.queryFilter(factory.filters.PoolCreated, 0);
        wethUsdcPoolAddress = events[0].args[3];
        wethUniPoolAddress = events[1].args[3];

        const { abi } = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString());

        wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, abi, ethers.provider);
        await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));

        wethUniPool = new ethers.Contract(wethUniPoolAddress, abi, ethers.provider);
        await wethUniPool.connect(lpSigner).initialize(await testUtils.sqrtP(10));

        console.log("wethUsdcPoolAddress", wethUsdcPoolAddress)
        console.log("wethUniPoolAddress", wethUniPoolAddress)
        console.log(await wethUsdcPool.slot0());
        console.log(await wethUniPool.slot0());

        await weth.mint(lpAccount, lpWethBalance);
        await usdc.mint(lpAccount, lpUsdcBalance);
        await uni.mint(lpAccount, lpUniBalance);

        await weth.mint(traderAccount, traderWethBalance);
        await usdc.mint(traderAccount, traderUsdcBalance);
        await uni.mint(traderAccount, traderUniBalance);

        manager = await ethers.deployContract("UniswapV3Manager", [factoryAddress]);
        managerAddress = manager.target;

        await weth.connect(lpSigner).approve(managerAddress, lpWethBalance);
        await usdc.connect(lpSigner).approve(managerAddress, lpUsdcBalance);
        await uni.connect(lpSigner).approve(managerAddress, lpUniBalance);

        await weth.connect(traderSigner).approve(managerAddress, traderWethBalance);
        await usdc.connect(traderSigner).approve(managerAddress, traderUsdcBalance);
        await uni.connect(traderSigner).approve(managerAddress, traderUniBalance);

        await manager.connect(lpSigner).mint({
            token0Address: wethAddress,
            token1Address: usdcAddress,
            fee: 3000,
            lowerTick: await testUtils.tick60(4545),
            upperTick: await testUtils.tick60(5500),
            amount0Desired: parseEther("1"),
            amount1Desired: parseEther("5000"),
            amount0Min: 0,
            amount1Min: 0
        });

        await manager.connect(lpSigner).mint({
            token0Address: wethAddress,
            token1Address: uniAddress,
            fee: 3000,
            lowerTick: await testUtils.tick60(7),
            upperTick: await testUtils.tick60(13),
            amount0Desired: parseEther("10"),
            amount1Desired: parseEther("100"),
            amount0Min: 0,
            amount1Min: 0
        });

        quoter = await ethers.deployContract("UniswapV3Quoter", [factoryAddress]);
        quoterAddress = quoter.target;
    })

    it("WETH => USDC quote", async function () {
        const quote = await quoter.quoteSingle.staticCall({
            tokenInAddress: wethAddress,
            tokenOutAddress: usdcAddress,
            fee: 3000,
            amountIn: parseEther("0.01337"),
            sqrtPriceLimitX96: await testUtils.sqrtP(4993),
        })
        assert.equal(quote[0], parseEther("66.607588492545060572"));
        assert.equal(quote[1], "5598811701211424979240405511481");
        assert.equal(quote[2], "85163")
    })

    it("WETH <= USDC quote", async function () {
        const quote = await quoter.quoteSingle.staticCall({
            tokenInAddress: usdcAddress,
            tokenOutAddress: wethAddress,
            fee: 3000,
            amountIn: parseEther("42"),
            sqrtPriceLimitX96: await testUtils.sqrtP(5005),
        })
        assert.equal(quote[0], parseEther("0.008371754005882864"));
        assert.equal(quote[1], "5604368801926411075902760472621");
        assert.equal(quote[2], "85183")
    })

    it("WETH => USDC quote and swap", async function () {
        const sqrtPriceLimitX96 = await testUtils.sqrtP(4993);
        const amountIn = parseEther("0.01337");

        const quote = await quoter.quoteSingle.staticCall({
            tokenInAddress: wethAddress,
            tokenOutAddress: usdcAddress,
            fee: 3000,
            amountIn,
            sqrtPriceLimitX96
        });

        const amountOut = quote[0];

        await manager.connect(traderSigner).swapSingle({
            tokenInAddress: wethAddress,
            tokenOutAddress: usdcAddress,
            fee: 3000,
            amountIn,
            sqrtPriceLimitX96
        });

        const filter = wethUsdcPool.filters.Swap;
        const events = await wethUsdcPool.queryFilter(filter, -1);
        const swapEvent = events[0];

        assert.equal(swapEvent.args[2], amountIn);
        assert.equal(-swapEvent.args[3], amountOut);
    })

    it(" WETH <= USDC quote and swap", async function () {
        const sqrtPriceLimitX96 = await testUtils.sqrtP(5010);
        const amountIn = parseEther("55")

        const quote = await quoter.quoteSingle.staticCall({
            tokenInAddress: usdcAddress,
            tokenOutAddress: wethAddress,
            fee: 3000,
            amountIn,
            sqrtPriceLimitX96
        });

        const amountOut = quote[0];

        await manager.connect(traderSigner).swapSingle({
            tokenInAddress: usdcAddress,
            tokenOutAddress: wethAddress,
            fee: 3000,
            amountIn,
            sqrtPriceLimitX96
        });

        const filter = wethUsdcPool.filters.Swap;
        const events = await wethUsdcPool.queryFilter(filter, -1);
        const swapEvent = events[1];

        assert.equal(-swapEvent.args[2], amountOut);
        assert.equal(swapEvent.args[3], amountIn);
    })

    it("UNI => WETH => USDC", async function () {

    })
})
