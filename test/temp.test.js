const addresses = [
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
];

const sortedAddresses = addresses.sort((a, b) => {
    const aNumber = BigInt(a);
    const bNumber = BigInt(b);
    return aNumber < bNumber ? -1 : aNumber > bNumber ? 1 : 0;
});

console.log("小到大排序后的结果：", sortedAddresses);
