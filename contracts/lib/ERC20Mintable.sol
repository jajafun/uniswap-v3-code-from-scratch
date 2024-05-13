// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Mintable is ERC20, Ownable {

    constructor (
        string memory name_,
        string memory symbol_,
        address owner_
    )
    ERC20(name_, symbol_)
    Ownable(owner_) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
