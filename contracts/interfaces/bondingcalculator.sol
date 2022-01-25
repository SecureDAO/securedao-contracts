// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface IBondingCalculator {
  function valuation( address token, uint amount ) external view returns ( uint value );
  function priceDecimals( address token ) external view returns ( uint );
  function assetPrice( address token ) external view returns ( uint );
}
