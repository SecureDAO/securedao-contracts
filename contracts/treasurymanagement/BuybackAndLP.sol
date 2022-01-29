// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.7.0;
pragma abicoder v2;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "@balancer-labs/v2-vault/contracts/interfaces/IVault.sol";
import "@balancer-labs/v2-vault/contracts/interfaces/IAsset.sol";
import "@balancer-labs/v2-pool-utils/contracts/interfaces/IPriceOracle.sol";

interface ISwapAndLP {
  function execute(uint256 _amount, address payable _recipient) external;
}

contract SwapAndLP is ISwapAndLP {
  IERC20 public have;
  IERC20 public balancerPool;
  IUniswapV2Router02 public router;
  address[] public routerPath;
  IERC20[] public lpTokens;
  IVault public vault;

  bytes32 poolId;

  constructor(address _have, address _vault, bytes32 _poolId, address _router, address[] memory _routerPath) {
    have = IERC20(_have);
    vault = IVault(_vault);
    poolId = _poolId;
    router = IUniswapV2Router02(_router);
    routerPath = _routerPath;

    (address _balancerPool, ) = vault.getPool(poolId);
    balancerPool = IERC20(_balancerPool);

    have.approve(_vault, type(uint256).max);
    have.approve(_router, type(uint256).max);

    (lpTokens, , ) = vault.getPoolTokens(poolId);
    for (uint256 i = 0; i < lpTokens.length; i++) {
      IERC20(address(lpTokens[i])).approve(_vault, type(uint256).max);
    }
  }

  function execute(uint256 _amount, address payable _recipient) external override {
    have.transferFrom(msg.sender, address(this), _amount);

    // Prevent accidental burns
    if (_recipient == address(0)) {
     _recipient = msg.sender;
    }


    uint256[] memory amounts = new uint256[](lpTokens.length);
    for (uint256 i; i < lpTokens.length; i++) {
      if (lpTokens[i] != have) {
        _swapBalancer(have, lpTokens[i], ((_amount*4)/10), payable(address(this)));
        _swapUni(((_amount*4)/10));
        amounts[i] = IERC20(lpTokens[i]).balanceOf(address(this));
      } else {
        amounts[i] = ((_amount*2)/10);
      }
    }

    _joinPoolBalancer(amounts);

    balancerPool.transfer(_recipient, balancerPool.balanceOf(address(this)));
  }

  function _swapUni(uint256 _amount) internal {
    router.swapExactTokensForTokens(
      _amount,
      0,
      routerPath,
      address(this),
      block.timestamp
    );
  }

  function _swapBalancer(IERC20 _in, IERC20 _out, uint256 _amount, address payable _recipient) internal {

    bytes memory userdata;
    IVault.SingleSwap memory swapInfo = IVault.SingleSwap(
      poolId,
      IVault.SwapKind.GIVEN_IN, // TODO
      IAsset(address(_in)),
      IAsset(address(_out)),
      _amount,
      userdata
    );

    IVault.FundManagement memory funds = IVault.FundManagement(
      address(this),
      false,
      _recipient,
      false
    );

    uint256 deadline = block.timestamp;
    vault.swap(
      swapInfo,
      funds,
      0,
      deadline
    );
  }

  function _joinPoolBalancer(uint256[] memory _amounts) internal {
    bytes memory userData = abi.encode(1, _amounts, 1); // TODO

    IAsset[] memory _lpTokens = new IAsset[](lpTokens.length);
    for (uint256 i = 0; i < lpTokens.length; i++) {
      _lpTokens[i] = IAsset(address(lpTokens[i]));
    }

    IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(_lpTokens, _amounts, userData, false);
    vault.joinPool(poolId, address(this), address(this), request);
  }
}
