// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.6.6;

interface IUniswapV2Oracle {
  function token0() external view returns (address);
  function token1() external view returns (address);
  function update() external;
  function canUpdate() external view returns (bool);
  function consult(address token, uint amountIn) external view returns (uint amountOut);
}

