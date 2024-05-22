const {ethers} = require("hardhat");
const {parseEther} = ethers;

const testUtilsArtifactLocation = "./artifacts/contracts/lib/TestUtils.sol/TestUtils.json";
const managerAbi = JSON.parse(require("fs").readFileSync(testUtilsArtifactLocation).toString())["abi"];
const testUtils = new ethers.Contract("0x863Df954Bc357E43cFF6F2eA3980A3c8B83C5a30", managerAbi, ethers.provider);

const wethAddress = "0x50b357824293402d12b172AA113e755658e433Ba";
const usdcAddress = "0x93554ea9F4F406529bd29679c7dc580391F1F47b";
const uniAddress = "0xAf3D16BA9139B47A50bBc357578A79b05f6878Be";
const wbtcAddress = "0x54e20264F04394e5209D8b3a7D2Bc4a0cCDAc69B";
const usdtAddress = "0xB39a4B8e076FE98217eC412660b93D9Eb7D9b87c";

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];

    const managerAddress = "0xdb6BC10f3e9B1A05c26c6AD4eC72981048Ed297F"

    const wethUsdcPoolAddress = "0x6C58ac6034C1dD4d54814BD28B0B14cE6E4850Eb";
    const wethUniPoolAddress = "0x6e61AD4E107E9C8619A1086858F5bDc49BDAA877";
    const wbtcUsdtPoolAddress = "0x7Af60790695Fb1B979DD083014258776B66109C0";

    const managerArtifactLocation = "./artifacts/contracts/UniswapV3Manager.sol/UniswapV3Manager.json";
    const managerAbi = JSON.parse(require("fs").readFileSync(managerArtifactLocation).toString())["abi"];
    const manager = new ethers.Contract(managerAddress, managerAbi, ethers.provider);

    const poolArtifactLocation = "./artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
    const poolAbi = JSON.parse(require("fs").readFileSync(poolArtifactLocation).toString())["abi"];

    const wethUsdcPool = new ethers.Contract(wethUsdcPoolAddress, poolAbi, ethers.provider);
    await wethUsdcPool.connect(lpSigner).initialize(await testUtils.sqrtP(5000));
    console.log("wethUsdcPool init");

    const wethUniPool = new ethers.Contract(wethUniPoolAddress, poolAbi, ethers.provider);
    await wethUniPool.connect(lpSigner).initialize(await testUtils.sqrtP(10));
    console.log("wethUniPool init");

    const wbtcUsdtPool = new ethers.Contract(wbtcUsdtPoolAddress, poolAbi, ethers.provider);
    await wbtcUsdtPool.connect(lpSigner).initialize(await testUtils.sqrtP(20000));
    console.log("wbtcUsdtPool init");

    await manager.connect(lpSigner).mint(await mintParams(
        wethAddress,
        usdcAddress,
        4545,
        5500,
        parseEther("10"),
        parseEther("50000")
    ));
    console.log("wethUsdcPool mint liquidity");

    await manager.connect(lpSigner).mint(await mintParams(
        wethAddress,
        uniAddress,
        7,
        13,
        parseEther("10"),
        parseEther("100")
    ));
    console.log("wethUniPool mint liquidity");

    await manager.connect(lpSigner).mint(await mintParams(
        wbtcAddress,
        usdtAddress,
        19400,
        20500,
        parseEther("10"),
        parseEther("200000")
    ));
    console.log("wbtcUsdtPool mint liquidity");

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
