// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface IOwnable {
  function transferOwnership(address newOwner) external;
  function owner() external returns (address);
}

