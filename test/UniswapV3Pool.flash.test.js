const {assert, expect} = require('chai');
const {ethers} = require('hardhat');
const {AbiCoder, parseEther} = require("ethers");

let signers, accounts, ownerSigner, ownerAccount, lpSigner, lpAccount;
let token0, token1, token0Account, token1Account;
let testUtils, pool, poolAccount, manager, managerAccount;

describe("UniswapV3Pool flash tests", () => {
    before(async () => {
        // 部署计算测试数据的合约
        testUtils = await ethers.deployContract("TestUtils");
    })

    describe("borrow some token0 and token1", async function () {
        const currentPrice = 5000;
        let poolBalance;
        const mintParamsArr = [];
        before(async () => {
            const mintParams0 = await mintParams(4545, 5500, "1", "5000");
            mintParamsArr.push(mintParams0);
            const params = {
                lpToken0Balance: parseEther("1"),
                lpToken1Balance: parseEther("5000"),
                currentPrice,
                mintParamsArr
            }
            poolBalance = await setup(params);
        })

        describe("after borrow ", async function () {
            let swapEvent;
            const amount0 = parseEther("0.5")
            const amount1 = parseEther("1000")
            before(async function () {
                const data = {
                    token0: token0Account,
                    token1: token1Account,
                    amount0,
                    amount1
                }
                const types = ["address", "address", "uint256", "uint256"];
                const dataEncoded = AbiCoder.defaultAbiCoder().encode(types, [data.token0, data.token1, data.amount0, data.amount1]);
                await manager.connect(traderSigner).flash(poolAccount, amount0, amount1 , dataEncoded);
                const filter = pool.filters.Flash;
                const events = await pool.queryFilter(filter, -1);
                swapEvent = events[0];
            })

            it("test1", async function () {
                const actualRecipient = swapEvent.args[0];
                const actualAmount0 = swapEvent.args[1];
                const actualAmount1 = swapEvent.args[2];
                assert.equal(actualRecipient, managerAccount);
                assert.equal(actualAmount0, amount0);
                assert.equal(actualAmount1, amount1);
            })
        })
    })
})


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
    traderSigner = signers[6];
    traderAccount = accounts[6];

    token0 = await ethers.deployContract("ERC20Mintable", ["Ether", "WETH", ownerAccount]);
    token1 = await ethers.deployContract("ERC20Mintable", ["USDC", "USDC", ownerAccount]);
    token0Account = token0.target;
    token1Account = token1.target;

    await token0.mint(lpAccount, params.lpToken0Balance);
    await token1.mint(lpAccount, params.lpToken1Balance);

    const currentSqrtP = await testUtils.sqrtP(params.currentPrice);
    const currentTick = await testUtils.tick(params.currentPrice);
    pool = await ethers.deployContract("UniswapV3Pool",
        [token0Account, token1Account, currentSqrtP, currentTick]);
    poolAccount = pool.target;

    manager = await ethers.deployContract("UniswapV3Manager");
    managerAccount = manager.target;

    await token0.connect(lpSigner).approve(managerAccount, params.lpToken0Balance);
    await token1.connect(lpSigner).approve(managerAccount, params.lpToken1Balance);

    const mintParamsArr = params.mintParamsArr;
    for (let i = 0; i < mintParamsArr.length; i++) {
        const mintParams = mintParamsArr[i];
        mintParams.poolAddress = poolAccount;
        await manager.connect(lpSigner).mint(mintParams);
    }
}

