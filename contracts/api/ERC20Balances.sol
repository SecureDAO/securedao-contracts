// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ERC20Balances {

  function balances(address holder, address[] memory tokens) external view returns (uint[] memory) {
    uint[] memory balances = new uint[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      balances[i] = IERC20(tokens[i]).balanceOf(holder);
    }

    return balances;
  }
}
