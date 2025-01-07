require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("solidity-coverage");

const dotenv = require("dotenv");
dotenv.config();

const privateKey = process.env.PRIVATE_KEY ?? "";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 9999,
      },
    },
  },
  networks: {
    baseSepolia: {
      url: `${process.env.RPC_URL_BASE_SEPOLIA}`,
      accounts: [privateKey],
      chainId: 84532,
      verify: {
        etherscan: {
          apiKey: process.env.BASE_SEPOLIA_API_KEY,
          apiUrl: "https://api-sepolia.basescan.org"
        }
      },
      confirmations: 6,
      timeoutBlocks: 200,
      gasPrice: "auto",
      deploymentTimeout: 120000,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASE_SEPOLIA_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/"
        }
      }
    ]
  },
  // docgen: {
  //   path: "./docs",
  //   clear: true,
  //   runOnCompile: true,
  // },
};
