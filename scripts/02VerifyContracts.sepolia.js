const {run} = require("hardhat");

async function verify(contractAddress, args) {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified!")
        } else {
            console.log(e)
        }
    }
}

// Factory
// verify("0x86aBa1bB87BaAf1207e783e9eeA40433F1441130", [])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });
// Manager
verify("0xdb6BC10f3e9B1A05c26c6AD4eC72981048Ed297F", ["0xfb569102F77879AB2DbDE8f5fe3E4fea0B13AABE"])
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });

// Quoter
// verify("0x0Ca50EFEbf50DCC2d08a1C6D41CC8c7C2c8B837A", ["0x86aBa1bB87BaAf1207e783e9eeA40433F1441130"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// // WETH/USDC
// verify("0xc3CEc9c960d997cC7E524d8Ef9f8CA2c25CB0A04", [])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// WETH/UNI
// verify("0x079E552305aA2Fc6e60217929c8D9899A0bB9a8D", [])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// WBTC/USDT
// verify("0xE8708fecbcD244E7220F50e78B5f532a546Aa0C1", [])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// TestUtils
// verify("0x863Df954Bc357E43cFF6F2eA3980A3c8B83C5a30", [])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });
