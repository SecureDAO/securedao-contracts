// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IERC20Extended is IERC20 {
  function decimals() external view returns ( uint);
}
