pragma solidity =0.5.16;

import "@uniswap/v2-core/contracts/UniswapV2Factory.sol";

contract Factory is UniswapV2Factory {
  constructor(address _feeToSetter) UniswapV2Factory(_feeToSetter) public {}
}
