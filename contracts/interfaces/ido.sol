// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface IIDO {
    function finalize(address native_) external;
    function salePrice() external returns (uint256);
    function closeSale() external;
}
