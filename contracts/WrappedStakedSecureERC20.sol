// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";

interface ISSCR is IERC20 {
  function index() external view returns (uint);
}

contract WrappedStakedSecureERC20 is ERC20 {
  using SafeERC20 for ISSCR;
  using SafeMath for uint256;

  ISSCR public immutable SSCR;

  event Wrap(address indexed recipient, uint256 amountSCR, uint256 amountSSCR);
  event Unwrap(address indexed recipient,uint256 amountSSCR, uint256 amountSCR);

  constructor(address _SSCR) ERC20('Wrapped Staked Secure', 'wsSCR') {
    require(_SSCR != address(0));
    SSCR = ISSCR(_SSCR);
  }

  /**
    @notice wrap sSCR
    @param _amount uint256
    @return uint256
   */
  function wrap(uint256 _amount) external returns(uint256) {
    SSCR.safeTransferFrom(msg.sender, address(this), _amount);

    uint256 value = unwrappedToWrapped(_amount);
    _mint(msg.sender, value);
    emit Wrap(msg.sender, _amount, value);
    return value;
  }

  /**
    @notice unwrap sSCR
    @param _amount uint256
    @return uint256
   */
  function unwrap(uint256 _amount) external returns(uint256) {
    _burn(msg.sender, _amount);

    uint256 value = wrappedToUnwrapped(_amount);
    SSCR.safeTransfer(msg.sender, value);
    emit Unwrap(msg.sender, _amount, value);
    return value;
  }

  /**
    @notice converts wsSCR amount to sSCR
    @param _amount uint256
    @return uint256
   */
  function wrappedToUnwrapped(uint256 _amount) public view returns(uint256) {
    return _amount.mul(SSCR.index()).div(10 ** decimals());
  }

  /**
    @notice converts sSCR amount to wsSCR
    @param _amount uint256
    @return uint256
   */
  function unwrappedToWrapped(uint256 _amount) public view returns(uint256) {
    return _amount.mul(10 ** decimals()).div(SSCR.index());
  }
}
