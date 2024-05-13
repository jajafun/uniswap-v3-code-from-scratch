require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");

const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(proxyAgent);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      },
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    sepolia: {
      url: 'https://sepolia.infura.io/v3/f71aec02114f42048358b5a74ad144a7',
      accounts: ['96a5ba349b63b12e1fd1249d79f935ef45922228145a8341d42033d209649f1f']
    }
  },
  etherscan: {
    apiKey: {
      sepolia: "UAZCF1BR5TX5BEA5R4B9KFTS1FIUG9F9XA"
    }
  },
  sourcify: {
    enabled: true
  },

};
