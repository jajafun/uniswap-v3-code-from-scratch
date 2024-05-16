const {ethers} = require("hardhat");
const {parseEther} = ethers;

let testUtils;

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];

    console.log("owner address", lpAddress);
    console.log("lp address", lpAddress);

    const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";

    testUtils = await ethers.deployContract("TestUtils");
    console.log("TestUtils address", lpAddress);

    let nonce = await ownerSigner.getNonce()
    console.log("nonce", nonce);

    const futureTokenAddresses = []
    for (let i = nonce; i < nonce + 5; i++) {
        const futureAddress = ethers.getCreateAddress({
            from: ownerAddress,
            nonce: i
        });
        futureTokenAddresses.push(futureAddress);
    }

    const sorted = futureTokenAddresses.slice().sort();
    const seq = [];
    futureTokenAddresses.forEach((item) => {
        seq.push(sorted.indexOf(item));
    })

    const tokenInfos = [
        ["Wrapped Ether", "WETH", ownerAddress],
        ["Wrapped BTC", "WBTC", ownerAddress],
        ["USD Coin", "USDC", ownerAddress],
        ["Uniswap Coin", "UNI", ownerAddress],
        ["USD Token", "USDT", ownerAddress]
    ]

    const tokens = {};
    for (let i = 0; i <seq.length; i++) {
        tokens[seq[i]] = (await ethers.deployContract("ERC20Mintable", tokenInfos[seq[i]]));
    }

    const weth = tokens[0];
    const wbtc = tokens[1];
    const usdc = tokens[2];
    const uni = tokens[3];
    const usdt = tokens[4];
    const wethAddress = weth.target;
    const usdcAddress = usdc.target;
    const uniAddress = uni.target;
    const wbtcAddress = wbtc.target;
    const usdtAddress = usdt.target;
    console.log("WETH address", wethAddress);
    console.log("USDC address", usdcAddress);
    console.log(" UNI address", uniAddress);
    console.log("WBTC address", wbtcAddress);
    console.log("USDT address", usdtAddress);

    const factory = await ethers.deployContract("UniswapV3Factory");
    const factoryAddress = factory.target;
    console.log("Factory address", factoryAddress);

    const manager = await ethers.deployContract("UniswapV3Manager", [factoryAddress]);
    const managerAddress = manager.target;
    console.log("Manager address", managerAddress);

    const quoter = await ethers.deployContract("UniswapV3Quoter", [factoryAddress]);
    const quoterAddress = quoter.target;
    console.log("Quoter address", quoterAddress);

    await factory.createPool(wethAddress, usdcAddress, 3000);
    await factory.createPool(wethAddress, uniAddress, 3000);
    await factory.createPool(wbtcAddress, usdtAddress, 3000);

    const poolCreatedEvents = await factory.queryFilter(factory.filters.PoolCreated, -5);
    const wethUsdcPoolAddress = poolCreatedEvents[0].args[3];
    const wethUniPoolAddress = poolCreatedEvents[1].args[3];
    const wbtcUsdtPoolAddress = poolCreatedEvents[2].args[3];

    console.log("WETH/USDC address", wethUsdcPoolAddress);
    console.log("WETH/UNI address", wethUniPoolAddress);
    console.log("WBTC/USDT address", wbtcUsdtPoolAddress);

    const {abi} = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString());
    const wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, abi, ethers.provider);
    await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));

    const wethUniPool = new ethers.Contract(wethUniPoolAddress, abi, ethers.provider);
    await wethUniPool.connect(lpSigner).initialize(await testUtils.sqrtP(10));

    const wbtcUsdtPool = new ethers.Contract(wbtcUsdtPoolAddress, abi, ethers.provider);
    await wbtcUsdtPool.connect(lpSigner).initialize(await testUtils.sqrtP(20000));

    let wethAmount = parseEther("100");
    let usdcAmount = parseEther("2000000");
    let uniAmount = parseEther("200");
    let wbtcAmount = parseEther("20");
    let usdtAmount = parseEther("2000000");

    await weth.mint(lpAddress, wethAmount);
    await usdc.mint(lpAddress, usdcAmount);
    await uni.mint(lpAddress, uniAmount);
    await wbtc.mint(lpAddress, wbtcAmount);
    await usdt.mint(lpAddress, usdcAmount);

    await weth.connect(lpSigner).approve(managerAddress, wethAmount);
    await usdc.connect(lpSigner).approve(managerAddress, usdcAmount);
    await uni.connect(lpSigner).approve(managerAddress, uniAmount);
    await wbtc.connect(lpSigner).approve(managerAddress, wbtcAmount);
    await usdt.connect(lpSigner).approve(managerAddress, usdtAmount);


    await manager.connect(lpSigner).mint(await mintParams(
        wethAddress,
        usdcAddress,
        4545,
        5500,
        parseEther("10"),
        parseEther("50000")
    ));

    await manager.connect(lpSigner).mint(await mintParams(
        wethAddress,
        uniAddress,
        7,
        13,
        parseEther("10"),
        parseEther("100")
    ));

    await manager.connect(lpSigner).mint(await mintParams(
        wbtcAddress,
        usdtAddress,
        19400,
        20500,
        parseEther("10"),
        parseEther("200000")
    ));

}

async function mintParams(token0Address, token1Address, lowerPrice, upperPrice, amount0, amount1) {
    const lowerTick = await testUtils.tick60(lowerPrice);
    const upperTick = await testUtils.tick60(upperPrice);
    return {
        token0Address: token0Address,
        token1Address: token1Address,
        fee: 3000,
        lowerTick: lowerTick,
        upperTick: upperTick,
        amount0Desired: amount0,
        amount1Desired: amount1,
        amount0Min: 0,
        amount1Min: 0
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
