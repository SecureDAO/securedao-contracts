// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/math/Math.sol";
import "./FixedPoint.sol";
import "./interfaces/bondingcalculator.sol";
import "./interfaces/erc20.sol";
import "./interfaces/uniswapv2oracle.sol";

contract UniswapV2OracleBondingCalculator is IBondingCalculator, Ownable {
    using FixedPoint for *;
    using SafeMath for uint;
    using SafeMath for uint112;

    IUniswapV2Oracle public oracle;

    constructor(address oracle_) {
        oracle = IUniswapV2Oracle(oracle_);
    }

    function setOracle(address newOracle) external onlyOwner {
        oracle = IUniswapV2Oracle(newOracle);
    }

    /**
     *  @notice return asset price from chainlink in 9 decimals
     */
    function assetPrice(address token) public view override returns ( uint ) {
        require(token == oracle.token0() || token == oracle.token1(), "Token not handled by this Bonding Calculator");
        uint val = oracle.consult(token, 10 ** IERC20Extended(token).decimals());
        uint decimals;
        if ( token == oracle.token0() ) {
            decimals = IERC20Extended(oracle.token1()).decimals();
        } else {
            decimals = IERC20Extended(oracle.token0()).decimals();
        }

        require(decimals <= 18);
        if ( decimals >= 9 ) {
            return val / (10**(decimals-9));
        } else {
            return val / (10**(9-decimals));
        }
    }

    function priceDecimals(address token) external view override returns ( uint ) {
        return 9;
    }

    function valuation( address token, uint amount ) external view override returns ( uint value ) {
        // $ value of the token amount in 9 decimals
        // Cannot support tokens with more than 18 decimals
        return amount.mul(assetPrice(token)).div(
            10 ** (36 - IERC20Extended(token).decimals())
        );
    }
}

