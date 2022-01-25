import "../SecureBondDepositoryV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BondDepositoryV2Test {
  SecureBondDepositoryV2 b = SecureBondDepositoryV2(0xbe0037eAf2d64fe5529BCa93c18C9702D3930376);
  ERC20 principle = ERC20(0x48BaCB9266a570d521063EF5dD96e61686DbE788);
  ERC20 scr = ERC20(0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48);

  uint256 testVal = 0;

  function approvePrincipleBond(uint256 amount) public {
    principle.approve(address(b), amount);
  }

  function approveSCRBond(uint256 amount) public {
    scr.approve(address(b), amount);
  }

  function deposit(uint256 amount, uint256 maxPrice, address depositor) public {
    b.deposit(amount, maxPrice, depositor);
  }

  function changeTestVal(uint256 val) public {
    testVal = val;
  }

  function echidna_true_is_true() public returns(bool) {
    return true == true;
  }

  function echidna_scr_is_not_zero() public returns(bool) {
    return b.SCR() != address(0);
  }

  function echidna_payout_for_zero_is_zero() public returns(bool) {
    return b.payoutFor(0) == 0;
  }

  function echidna_payout_for_nonzero_is_nonzero() public returns(bool) {
    if (testVal == 0 ) {
      return true;
    }
    return b.payoutFor(testVal) > 0;
  }
}
