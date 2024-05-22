const {ethers, run} = require("hardhat");
const {parseEther} = ethers;

let testUtils;

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];

    console.log("owner address", ownerAddress);
    console.log("lp address", lpAddress);

    testUtils = await ethers.deployContract("TestUtils");
    console.log("TestUtils address", testUtils.target);

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
    console.log("futureTokenAddresses");
    console.log(futureTokenAddresses);

    const sorted = futureTokenAddresses.slice().sort();
    sorted.forEach((item, index) => console.log(index, item));

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
        console.log("nonce", await ownerSigner.getNonce());

        let seqElement = seq[i];
        let tokenInfo = tokenInfos[seqElement];
        tokens[seqElement] = await ethers.deployContract("ERC20Mintable", tokenInfo);
        console.log("deploy token", seqElement, tokenInfo);
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

    console.log("nonce", await ownerSigner.getNonce());
    const factory = await ethers.deployContract("UniswapV3Factory");
    const factoryAddress = factory.target;
    console.log("Factory address", factoryAddress);

    console.log("nonce", await ownerSigner.getNonce());
    const manager = await ethers.deployContract("UniswapV3Manager", [factoryAddress]);
    const managerAddress = manager.target;
    console.log("Manager address", managerAddress);

    console.log("nonce", await ownerSigner.getNonce());
    const quoter = await ethers.deployContract("UniswapV3Quoter", [factoryAddress]);
    const quoterAddress = quoter.target;
    console.log("Quoter address", quoterAddress);

    console.log("nonce", await ownerSigner.getNonce());
    await factory.createPool(wethAddress, usdcAddress, 3000);

    console.log("nonce", await ownerSigner.getNonce());
    await factory.createPool(wethAddress, uniAddress, 3000);

    console.log("nonce", await ownerSigner.getNonce());
    await factory.createPool(wbtcAddress, usdtAddress, 3000);

    let wethAmount = parseEther("100");
    let usdcAmount = parseEther("2000000");
    let uniAmount = parseEther("200");
    let wbtcAmount = parseEther("20");
    let usdtAmount = parseEther("2000000");

    await weth.mint(lpAddress, wethAmount);
    console.log("mint weth", lpAddress, wethAmount);
    await usdc.mint(lpAddress, usdcAmount);
    console.log("mint usdc", lpAddress, usdcAmount);
    await uni.mint(lpAddress, uniAmount);
    console.log("mint uni", lpAddress, uniAmount);
    await wbtc.mint(lpAddress, wbtcAmount);
    console.log("mint wbtc", lpAddress, wbtcAmount);
    await usdt.mint(lpAddress, usdcAmount);
    console.log("mint usdt", lpAddress, usdcAmount);

    await weth.connect(lpSigner).approve(managerAddress, wethAmount);
    console.log("approve weth", managerAddress, wethAmount);
    await usdc.connect(lpSigner).approve(managerAddress, usdcAmount);
    console.log("approve usdc", managerAddress, usdcAmount);
    await uni.connect(lpSigner).approve(managerAddress, uniAmount);
    console.log("approve uni", managerAddress, uniAmount);
    await wbtc.connect(lpSigner).approve(managerAddress, wbtcAmount);
    console.log("approve wbtc", managerAddress, wbtcAmount);
    await usdt.connect(lpSigner).approve(managerAddress, usdtAmount);
    console.log("approve usdt", managerAddress, usdtAmount);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
