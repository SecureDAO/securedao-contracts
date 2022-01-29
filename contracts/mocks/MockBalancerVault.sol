// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@balancer-labs/v2-vault/contracts/interfaces/IVault.sol";

contract MockBalancerVault {
    mapping(bytes32 => IERC20[]) poolTokens;
    mapping(bytes32 => uint256[]) poolTokenBalances;
    mapping(bytes32 => IERC20)  poolBPT;

    function updatePoolInfo(bytes32 _poolId, IERC20[] memory _tokens, uint256[] memory _balances, IERC20 _bpt) public {
      poolTokens[_poolId] = _tokens;
      poolTokenBalances[_poolId] = _balances;
      poolBPT[_poolId] = _bpt;
    }

    function swap(
        IVault.SingleSwap memory singleSwap,
        IVault.FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256) {
      IERC20(address(singleSwap.assetIn)).transferFrom(msg.sender, address(this), singleSwap.amount);
      IERC20(address(singleSwap.assetOut)).transfer(msg.sender, singleSwap.amount);
    }

    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        IVault.JoinPoolRequest memory request
    ) external payable {
      for (uint256 i = 0; i < request.assets.length; i++) {
        IERC20(address(request.assets[i])).transferFrom(msg.sender, address(this), request.maxAmountsIn[0]);
      }
      poolBPT[poolId].transfer(msg.sender, 10 ether);
    }

    function getPool(bytes32 poolId) public view returns (address, IVault.PoolSpecialization) {
      return (address(poolBPT[poolId]), IVault.PoolSpecialization.GENERAL);
    }

    function getPoolTokens(bytes32 _poolId) public view returns(IERC20[] memory, uint256[] memory, uint256) {
      return (poolTokens[_poolId], poolTokenBalances[_poolId], block.number);
    }
}
