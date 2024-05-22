const {ethers, run} = require("hardhat");
const {parseEther} = ethers;

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];
    const traderSigner = signers[2];
    const traderAddress = accounts[2];

    console.log("owner address", ownerAddress);
    console.log("lp address", lpAddress);
    console.log("trader address", traderAddress);

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
    console.log("sorted");
    console.log(sorted);

    const seq = [];
    futureTokenAddresses.forEach((item) => {
        seq.push(sorted.indexOf(item));
    })
    console.log("seq")
    console.log(seq)

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

    console.log("tokens")
    console.log(tokens)

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
    console.log("mint usdt", lpAddress, usdtAmount);

    await weth.mint(traderAddress, wethAmount);
    console.log("mint weth", traderAddress, wethAmount);
    await usdc.mint(traderAddress, usdcAmount);
    console.log("mint usdc", traderAddress, usdcAmount);
    await uni.mint(traderAddress, uniAmount);
    console.log("mint uni", traderAddress, uniAmount);
    await wbtc.mint(traderAddress, wbtcAmount);
    console.log("mint wbtc", traderAddress, wbtcAmount);
    await usdt.mint(traderAddress, usdcAmount);
    console.log("mint usdt", traderAddress, usdtAmount);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
