// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/math/Math.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";
import "./FixedPoint.sol";
import "./interfaces/bondingcalculator.sol";
import "./interfaces/erc20.sol";

contract ReserveBondingCalculator is IBondingCalculator, Ownable {
    using FixedPoint for *;
    using SafeMath for uint;
    using SafeMath for uint112;

    address[] public feedList;
    mapping(address => AggregatorV3Interface) public feeds;

    constructor() {}

    function assetPrice(address token) public view override returns ( uint ) {
        return 1e9;
    }

    function valuation( address token, uint amount ) external view override returns ( uint value ) {
        // $ value of the token amount in 8 decimals
        // Cannot support tokens with more than 18 decimals
        return amount.mul(assetPrice(token)).div(
            10 ** (37 - IERC20Extended(token).decimals())
        );
    }

    function priceDecimals( address token ) public view override returns ( uint ) {
      return 9;
    }
}

