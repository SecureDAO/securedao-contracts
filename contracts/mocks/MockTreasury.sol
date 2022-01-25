// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

contract MockTreasury {
  function valueOf(address principle, uint256 amount) public view returns (uint256) {
    return 1 gwei;
  }

  function deposit(uint256 amount, address principle, uint256 profit) public returns (uint256) {
    return 1 gwei;
  }
}
