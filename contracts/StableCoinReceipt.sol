// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StableCoinReceipt is ERC20, Ownable {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  function mint(uint256 _amount) external onlyOwner {
    _mint(owner(), _amount);
  }

  function burn(uint256 _amount) external onlyOwner {
    _burn(owner(), _amount);
  }
}
