const {ethers, run} = require("hardhat");
const {parseEther} = ethers;

const wethAddress = "0x50b357824293402d12b172AA113e755658e433Ba";
const usdcAddress = "0x93554ea9F4F406529bd29679c7dc580391F1F47b";
const uniAddress = "0xAf3D16BA9139B47A50bBc357578A79b05f6878Be";
const wbtcAddress = "0x54e20264F04394e5209D8b3a7D2Bc4a0cCDAc69B";
const usdtAddress = "0xB39a4B8e076FE98217eC412660b93D9Eb7D9b87c";

const erc20MintableAbi = "./artifacts/contracts/lib/ERC20Mintable.sol/ERC20Mintable.json";

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];

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
    // await factory.createPool(wbtcAddress, usdtAddress, 3000);

    let wethAmount = parseEther("100");
    let usdcAmount = parseEther("2000000");
    let uniAmount = parseEther("200");
    let wbtcAmount = parseEther("20");
    let usdtAmount = parseEther("2000000");

    const erc20Abi = JSON.parse(require("fs").readFileSync(erc20MintableAbi).toString())["abi"];

    const weth = new ethers.Contract(wethAddress, erc20Abi, ethers.provider);
    await weth.connect(lpSigner).approve(managerAddress, wethAmount);
    console.log("approve weth", managerAddress, wethAmount);

    const usdc = new ethers.Contract(usdcAddress, erc20Abi, ethers.provider);
    await usdc.connect(lpSigner).approve(managerAddress, usdcAmount);
    console.log("approve usdc", managerAddress, usdcAmount);

    const uni = new ethers.Contract(uniAddress, erc20Abi, ethers.provider);
    await uni.connect(lpSigner).approve(managerAddress, uniAmount);
    console.log("approve uni", managerAddress, uniAmount);

    const wbtc = new ethers.Contract(wbtcAddress, erc20Abi, ethers.provider);
    await wbtc.connect(lpSigner).approve(managerAddress, wbtcAmount);
    console.log("approve wbtc", managerAddress, wbtcAmount);

    const usdt = new ethers.Contract(usdtAddress, erc20Abi, ethers.provider);
    await usdt.connect(lpSigner).approve(managerAddress, usdtAmount);
    console.log("approve usdt", managerAddress, usdtAmount);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
