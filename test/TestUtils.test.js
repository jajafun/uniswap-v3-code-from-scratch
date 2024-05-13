const {assert, expect} = require('chai');
const {ethers} = require('hardhat');

describe('TestUtils', function() {
    let testUtils;
    before(async function() {
        testUtils = await ethers.deployContract("TestUtils");
    })

    it("compute 1", async function() {
        const lowerPrice = 4545;
        const currentPrice = 5000;
        const upperPrice = 5500;
        const amount0 = ethers.parseEther("1");
        const amount1 = ethers.parseEther("5000");

        const liquidityRange = await testUtils.liquidityRange.staticCall(lowerPrice, currentPrice, upperPrice, amount0, amount1);

        const liquidity = {
            lowerTick: liquidityRange[0].toString(),
            upperTick: liquidityRange[1].toString(),
            liquidity: liquidityRange[2].toString()
        }
        console.log(liquidity)
    })
})
