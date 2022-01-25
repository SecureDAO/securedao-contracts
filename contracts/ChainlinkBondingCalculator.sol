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

contract ChainlinkBondingCalculator is IBondingCalculator, Ownable {
    using FixedPoint for *;
    using SafeMath for uint;
    using SafeMath for uint112;

    address[] public feedList;
    mapping(address => AggregatorV3Interface) public feeds;

    constructor() {}

    function updatePriceFeed(address token, address feed) external onlyOwner {
      feeds[token] = AggregatorV3Interface( feed );
    }

    /**
     *  @notice return asset price from chainlink in 9 decimals
     */
    function assetPrice(address token) public view override returns ( uint ) {
        ( , int price, , , ) = feeds[token].latestRoundData();

        if (feeds[token].decimals() <= 9) {
            return uint(price).mul(10 ** (9 - feeds[token].decimals()));
        } else {
            return uint(price).div(10 ** (feeds[token].decimals() - 9));
        }
    }

    function priceDecimals(address token) external view override returns ( uint ) {
        return feeds[token].decimals();
    }

    function valuation( address token, uint amount ) external view override returns ( uint value ) {
        // $ value of the token amount in 9 decimals
        // Cannot support tokens with more than 18 decimals
        return amount.mul(assetPrice(token)).div(
            10 ** (36 - IERC20Extended(token).decimals())
        );
    }
}
