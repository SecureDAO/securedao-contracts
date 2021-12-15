// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import "./interfaces/treasury.sol";
import "./interfaces/factory.sol";
import "./interfaces/ido.sol";
import "./interfaces/ownable.sol";

// Echidna doesn't like importing this for some reason
interface IStaking {
  function stake(uint256 _amount, address _recipient) external returns (bool);
}

contract Finalizer is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  uint256 constant public lpPercent  = 7000;  // Percent of funds raised for LP in BPS
  uint256 constant public teamComp   = 1000;  // Percent of funds raised sent to team wallet in BPS
  uint256 constant public listMarkup = 13700; // Markup for market listing in BPS

  IFactory  immutable public factory;
  ITreasury immutable public treasury;
  IStaking  immutable public staking;

  IIDO      public ido;

  // team wallet address
  address immutable public team;
  address immutable public lpBondingCalculator;

  bool public initialized;
  bool public finalized;

  uint256 public reserveRaised;

  constructor (
    address treasury_, address staking_,
    address team_, address factory_, address lpBondingCalculator_
  ) {
    require(treasury_ != address(0));
    require(staking_ != address(0));
    require(team_ != address(0));
    require(factory_ != address(0));
    require(lpBondingCalculator_ != address(0));

    factory = IFactory(factory_);
    treasury = ITreasury(treasury_);
    staking = IStaking(staking_);
    team = team_;
    lpBondingCalculator = lpBondingCalculator_;
  }

  function setIDO(address ido_) external onlyOwner {
    require(!initialized);
    require(ido_ != address(0));
    initialized = true;
    ido = IIDO(ido_);
  }

  function finalize() external {
    require(!finalized, "Already finalized");
    finalized = true;

    treasury.pullManagement();
    require(treasury.secondsNeededForQueue() == 0, "Finalizer can't work unless queue delay is 0");

    IERC20 reserve = IERC20(ido.reserve());
    address scr = treasury.SCR();

    address lp = factory.getPair(scr, address(reserve));
    if (lp == address(0)) {
      lp = factory.createPair(scr, address(reserve));
    }

    require(lp != address(0), "LP pair not created");

    assert(treasury.queue(ITreasury.MANAGING.RESERVEDEPOSITOR, address(this)));
    assert(treasury.toggle(ITreasury.MANAGING.RESERVEDEPOSITOR, address(this), address(0)));
    assert(treasury.queue(ITreasury.MANAGING.LIQUIDITYDEPOSITOR, address(this)));
    assert(treasury.toggle(ITreasury.MANAGING.LIQUIDITYDEPOSITOR, address(this), address(0)));
    assert(treasury.queue(ITreasury.MANAGING.LIQUIDITYTOKEN, lp));
    assert(treasury.toggle(ITreasury.MANAGING.LIQUIDITYTOKEN, lp, lpBondingCalculator));

    finalizeIDO(scr, lp, reserve);

    assert(treasury.toggle(ITreasury.MANAGING.RESERVEDEPOSITOR, address(this), address(0)));
    assert(treasury.toggle(ITreasury.MANAGING.LIQUIDITYDEPOSITOR, address(this), address(0)));

    // Return treasury ownership to the owner of this contract
    _returnOwnership();
  }

  function mintLp(IERC20 reserve, address native_, address reserveNativeLP_) internal returns (uint256) {
    uint256 reserveAmountLP = (reserveRaised * lpPercent) / 1e4;
    // lpPercent and listMarkup are in BPS salePrice in wei
    uint256 nativeAmountLP = (reserveRaised * lpPercent * 1e9) / (ido.salePrice() * listMarkup);
    uint256 amountSold = ido.totalAmount() - ido.amountRemaining();
    uint256 nativeMinted = treasury.deposit(
      (nativeAmountLP + amountSold)*1e9, address(reserve), 0
    );

    require(nativeMinted == (nativeAmountLP + amountSold), "Too much minted");

    reserve.safeTransfer(reserveNativeLP_, reserveAmountLP);
    IERC20(native_).safeTransfer(reserveNativeLP_, nativeAmountLP);

    return IUniswapV2Pair(reserveNativeLP_).mint(address(this));
  }

  function depositLP(IERC20 reserve, address native_, address reserveNativeLP_) internal {
    uint256 lpBalance = mintLp(reserve, native_, reserveNativeLP_);
    uint256 valueOfToken = treasury.valueOf(
      reserveNativeLP_,
      lpBalance
    );

    assert(IERC20(reserveNativeLP_).approve(address(treasury), lpBalance));
    uint256 nativeMinted = treasury.deposit(
      lpBalance,
      reserveNativeLP_,
      valueOfToken
    );
    require(nativeMinted == 0, "Should not mint any native tokens");
  }

  function distributeFunds(IERC20 reserve) internal {
    reserve.safeTransfer(team, (reserveRaised*teamComp)/1e4);

    uint256 nativeMinted = treasury.deposit(
      reserve.balanceOf(address(this)),
      address(reserve),
      treasury.valueOf(
        address(reserve),
        reserve.balanceOf(address(this)) // deposit all remaining
      )
    );

    require(nativeMinted == 0, "Should not mint any native tokens");
    assert(reserve.balanceOf(address(this)) == 0);
  }

  function finalizeIDO(address native_, address reserveNativeLP_, IERC20 reserve) internal {
    uint256 balBefore = reserve.balanceOf(address(this));
    ido.closeSale();

    reserveRaised = reserve.balanceOf(address(this)).sub(balBefore);
    require(reserveRaised > 0, "No reserve received");
    assert(reserve.approve(address(treasury), reserveRaised));

    depositLP(reserve, native_, reserveNativeLP_);

    uint256 amountSold = ido.totalAmount() - ido.amountRemaining();
    IERC20(native_).safeTransfer(address(ido), amountSold);

    assert(IERC20(native_).balanceOf(address(this)) == 0);

    distributeFunds(reserve);

    ido.finalize(native_);
  }

  function returnOwnership() external onlyOwner {
    _returnOwnership();
  }

  function _returnOwnership() internal {
    require(treasury.manager() == address(this), "Finalizer is not treasury owner");
    treasury.pushManagement(owner());
  }
}
