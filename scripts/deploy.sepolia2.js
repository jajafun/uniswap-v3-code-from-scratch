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

    const testUtilsAddress = ""
    const wethUsdcPoolAddress = "";
    const wethUniPoolAddress = "";
    const wbtcUsdtPoolAddress = "";
    const managerAddress = ""

    const testUtilsArtifactLocation = "./artifacts/contracts/lib/TestUtils.sol";
    const testUtilsAbi = JSON.parse(require("fs").readFileSync(testUtilsArtifactLocation).toString())["abi"];
    testUtils = new ethers.Contract(testUtilsAddress, testUtilsAbi, ethers.provider);

    const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
    const poolAbi = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString())["abi"];

    const managerArtifactLocation = "./artifacts/contracts/UniswapV3Manager.sol/UniswapV3Manager.json";
    const managerAbi = JSON.parse(require("fs").readFileSync(managerArtifactLocation).toString())["abi"];
    const manager = new ethers.Contract(managerAddress, managerAbi, ethers.provider);

    console.log("await testUtils.sqrtP(5000)", await testUtils.sqrtP(5000));
    const wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, poolAbi, ethers.provider);
    await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));

    const wethUniPool = new ethers.Contract(wethUniPoolAddress, poolAbi, ethers.provider);
    await wethUniPool.connect(lpSigner).initialize(await testUtils.sqrtP(10));

    const wbtcUsdtPool = new ethers.Contract(wbtcUsdtPoolAddress, poolAbi, ethers.provider);
    await wbtcUsdtPool.connect(lpSigner).initialize(await testUtils.sqrtP(20000));

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
