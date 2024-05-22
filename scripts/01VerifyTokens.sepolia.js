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


// weth
// verify("0x50b357824293402d12b172AA113e755658e433Ba", ["Wrapped Ether", "WETH", "0x9D237806a0FacFf26684161e5D037D4A853A03e3"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// wbtc
// verify("0x70c0d499b8c57C7CD2B1BC808dB06dF916A5b6f8", ["Wrapped BTC", "WBTC", "0x9D237806a0FacFf26684161e5D037D4A853A03e3"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// usdc
// verify("0x7F3FEE2B98D7349828673f47792634bB4B1bc537", ["USD Coin", "USDC", "0x9D237806a0FacFf26684161e5D037D4A853A03e3"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });

// // uni
// verify("0x96E125F6725E5D7f7681AC0558F3D6E81Bb4266e", ["Uniswap Coin", "UNI", "0x9D237806a0FacFf26684161e5D037D4A853A03e3"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });
//
// // usdt
// verify("0xdB201B984143420209f4191E090cf95ceB5dab31", ["USD Token", "USDT", "0x9D237806a0FacFf26684161e5D037D4A853A03e3"])
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });
