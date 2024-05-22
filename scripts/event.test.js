
const {ethers} = require("hardhat");
const {parseEther} = ethers;

async function main() {
    const signers = await ethers.getSigners();
    const accounts = signers.map((x) => x.address);
    const ownerSigner = signers[0];
    const ownerAddress = accounts[0];
    const lpSigner = signers[1];
    const lpAddress = accounts[1];

    console.log("owner address", ownerAddress);
    console.log("lp address", lpAddress);

    const abi = [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "PoolAlreadyExists",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "TokensMustBeDifferent",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "UnsupportedTickSpacing",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "ZeroAddressNotAllowed",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "token0",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "token1",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "uint24",
                    "name": "tickSpacing",
                    "type": "uint24"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "pool",
                    "type": "address"
                }
            ],
            "name": "PoolCreated",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "token0Address",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "token1Address",
                    "type": "address"
                },
                {
                    "internalType": "uint24",
                    "name": "fee",
                    "type": "uint24"
                }
            ],
            "name": "createPool",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "poolAddress",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint24",
                    "name": "",
                    "type": "uint24"
                }
            ],
            "name": "fees",
            "outputs": [
                {
                    "internalType": "uint24",
                    "name": "",
                    "type": "uint24"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "parameters",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "factoryAddress",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "token0Address",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "token1Address",
                    "type": "address"
                },
                {
                    "internalType": "uint24",
                    "name": "tickSpacing",
                    "type": "uint24"
                },
                {
                    "internalType": "uint24",
                    "name": "fee",
                    "type": "uint24"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint24",
                    "name": "",
                    "type": "uint24"
                }
            ],
            "name": "pools",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    const factory = new ethers.Contract("0xc96D9bE8Fc621595B0aE135eb8CCe7bEd56c491B", abi, ethers.provider);

    const poolCreatedEvents = await factory.queryFilter(factory.filters.PoolCreated, -3);
    console.log(poolCreatedEvents);
    const wethUsdcPoolAddress = poolCreatedEvents[0].args[3];
    const wethUniPoolAddress = poolCreatedEvents[1].args[3];
    const wbtcUsdtPoolAddress = poolCreatedEvents[2].args[3];

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
