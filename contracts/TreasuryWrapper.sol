// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

interface ITreasury {
  function valueOf( address _token, uint _amount ) external view returns ( uint value_ );
}

contract TreasuryWrapper {
  address internal immutable treasury;

  constructor(address treasury_) {
    treasury = treasury_;
  }

  /**
      @notice returns SCR valuation of asset
      @param _token address
      @param _amount uint
      @return value_ uint
   */
  function valueOfToken( address _token, uint _amount ) external view returns ( uint value_ ) {
    return ITreasury(treasury).valueOf(_token, _amount);
  }
}
