require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");

const {ProxyAgent, setGlobalDispatcher} = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(proxyAgent);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 10
            },
        }
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true
        },
        sepolia: {
            url: 'https://sepolia.infura.io/v3/f71aec02114f42048358b5a74ad144a7',
            accounts: [
                "c91b5cf20d584368519fc1e5813d40ceef19edf3c092a64c7fa27fac1e31e73f",
                '96a5ba349b63b12e1fd1249d79f935ef45922228145a8341d42033d209649f1f',
                '298322ece2bc153d33dd19f4a3c7649b22f3d05b388626d25c562656188c8d5d'
            ]
        }
    },
    etherscan: {
        apiKey: {
            sepolia: "UAZCF1BR5TX5BEA5R4B9KFTS1FIUG9F9XA"
        }
    },
    sourcify: {
        enabled: false
    },

};
