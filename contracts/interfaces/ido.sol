// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface IIDO {
    function totalAmount()             external returns (uint256);
    function amountRemaining()         external returns (uint256);
    function reserve()                 external returns (address);
    function finalizer()               external returns (address);
    function salePrice()               external returns (uint256);
    function closeSale()               external;
    function finalize(address native_) external;
}
