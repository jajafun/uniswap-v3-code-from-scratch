const { ethers } = require("hardhat");

async function main() {
    const [ owner ] = await ethers.getSigners();
    const transactionCount = await ethers.provider.getTransactionCount(owner.address);

    for(let i = 0; i < 5; i++) {
        // gets the address of the token before it is deployed
        const futureAddress = ethers.getCreateAddress({
            from: owner.address,
            nonce: transactionCount + i
        });
        console.log(futureAddress);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
