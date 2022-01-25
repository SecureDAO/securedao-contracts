// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/math/Math.sol";
import "./FixedPoint.sol";
import "./interfaces/staking.sol";
import "./interfaces/treasury.sol";
import "./interfaces/bondingcalculator.sol";
import "./interfaces/erc20.sol";

contract SecureBondDepositoryV2 is Ownable {

    using FixedPoint for *;
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using SafeMath for uint32;




    /* ======== EVENTS ======== */

    event BondCreated( uint deposit, uint indexed payout, uint indexed expires, uint indexed priceInUSD );
    event BondRedeemed( address indexed recipient, uint payout, uint remaining );
    event BondTermChanged( PARAMETER indexed parameter, uint input );
    event BondPriceChanged( uint indexed priceInUSD, uint indexed internalPrice, uint indexed debtRatio );
    event ControlVariableAdjustment( uint initialBCV, uint newBCV, uint adjustment, bool addition );
    event StakingHelperChanged( address newAddress );
    event StakingChanged( address newAddress );
    event AdjustmentChanged( bool add, uint increment, uint target, uint buffer);




    /* ======== STATE VARIABLES ======== */

    address public immutable SCR; // token given as payment for bond
    address public immutable principle; // token used to create bond
    address public immutable treasury; // mints OHM when receives principle
    address public immutable DAO; // receives profit share from bond

    address public immutable bondCalculator; // calculates value of tokens used for bonding

    address public staking; // to auto-stake payout
    address public stakingHelper; // to stake and claim if no staking warmup

    Terms public terms; // stores terms for new bonds
    Adjust public adjustment; // stores adjustment to BCV data

    mapping( address => Bond ) public bondInfo; // stores bond information for depositors

    uint public totalDebt; // total value of outstanding bonds; used for pricing
    uint32 public lastDecay; // reference time for debt decay

    address public approvedSender;




    /* ======== STRUCTS ======== */

    struct Approval {
      bool deposit;
      bool redeem;
      bool initialized;
    }

    // Info for creating new bonds
    struct Terms {
        uint controlVariable; // scaling variable for price
        uint minimumPrice; // vs principle value
        uint maxPayout; // in thousandths of a %. i.e. 500 = 0.5%
        uint fee; // as % of bond payout, in hundreths. ( 500 = 5% = 0.05 for every 1 paid)
        uint maxDebt; // 9 decimal debt ratio, max % total supply created as debt
        uint32 vestingTerm; // in seconds
    }

    // Info for bond holder
    struct Bond {
        uint payout; // OHM remaining to be paid
        uint pricePaid; // In DAI, for front end viewing
        uint32 lastTime; // Last interaction
        uint32 vesting; // Seconds left to vest
    }

    // Info for incremental adjustments to control variable
    struct Adjust {
        bool add; // addition or subtraction
        uint rate; // increment
        uint target; // BCV when adjustment finished
        uint32 buffer; // minimum length (in seconds) between adjustments
        uint32 lastTime; // time when last adjustment made
    }




    /* ======== INITIALIZATION ======== */

    constructor (
        address SCR_,
        address principle_,
        address treasury_,
        address DAO_,
        address bondCalculator_
    ) {
        require( SCR_ != address(0) );
        SCR = SCR_;
        require( principle_ != address(0) );
        principle = principle_;
        require( treasury_ != address(0) );
        treasury = treasury_;
        require( DAO_ != address(0) );
        DAO = DAO_;
        require( bondCalculator_ != address(0) );
        bondCalculator = bondCalculator_;
    }

    /**
     *  @notice initializes bond parameters
     *  @param controlVariable_ uint
     *  @param vestingTerm_ uint32
     *  @param minimumPrice_ uint
     *  @param maxPayout_ uint
     *  @param fee_ uint
     *  @param maxDebt_ uint
     *  @param initialDebt_ uint
     */
    function initializeBondTerms(
        uint controlVariable_,
        uint minimumPrice_,
        uint maxPayout_,
        uint fee_,
        uint maxDebt_,
        uint initialDebt_,
        uint32 vestingTerm_
    ) external onlyOwner() {
        require( terms.controlVariable == 0, "Bonds must be initialized from 0" );
        terms = Terms ({
            controlVariable: controlVariable_,
            minimumPrice: minimumPrice_,
            maxPayout: maxPayout_,
            fee: fee_,
            maxDebt: maxDebt_,
            vestingTerm: vestingTerm_
        });
        totalDebt = initialDebt_;
        lastDecay = uint32(block.timestamp);
    }




    /* ======== POLICY FUNCTIONS ======== */

    enum PARAMETER { VESTING, PAYOUT, FEE, DEBT, MINPRICE, BCV }
    /**
     *  @notice set parameters for new bonds
     *  @param parameter_ PARAMETER
     *  @param input_ uint
     */
    function setBondTerms ( PARAMETER parameter_, uint input_ ) external onlyOwner() {
        if ( parameter_ == PARAMETER.VESTING ) { // 0
            require( input_ >= 1 days, "Vesting must be at least 24 hours" );
            terms.vestingTerm = uint32(input_);
        } else if ( parameter_ == PARAMETER.PAYOUT ) { // 1
            require( input_ <= 1e4/10, "Payout cannot be above 1 percent" );
            terms.maxPayout = input_;
        } else if ( parameter_ == PARAMETER.FEE ) { // 2
            require( input_ <= 1e4/2, "DAO fee cannot exceed 50% of payout" );
            terms.fee = input_;
        } else if ( parameter_ == PARAMETER.DEBT ) { // 3
            terms.maxDebt = input_;
        } else if ( parameter_ == PARAMETER.MINPRICE ) { // 4
            require( input_ > 0, "Cannot set minmum price to zero" );
            terms.minimumPrice = input_;
        } else if ( parameter_ == PARAMETER.BCV ) { // 5
            require(input_ <= Math.max(1, terms.controlVariable/2), "New BCV must be 1/2 current or less");
            terms.controlVariable = input_;
        }

        emit BondTermChanged(parameter_, input_);
    }

    /**
     *  @notice set control variable adjustment
     *  @param addition_ bool
     *  @param increment_ uint
     *  @param target_ uint
     *  @param buffer_ uint
     */
    function setAdjustment (
        bool addition_,
        uint increment_,
        uint target_,
        uint32 buffer_
    ) external onlyOwner() {
        uint256 max = Math.max(1, terms.controlVariable/2);
        require( increment_ <= max, "Increment too large" );

        adjustment = Adjust({
            add: addition_,
            rate: increment_,
            target: target_,
            buffer: buffer_,
            lastTime: uint32(block.timestamp)
        });

        emit AdjustmentChanged(addition_, increment_, target_, buffer_);
    }

    /**
     *  @notice set staking contract
     *  @param staking_ address
     */
    function setStaking( address staking_) external onlyOwner() {
        require( staking_ != address(0) );
        staking = staking_;
        emit StakingChanged(staking);
    }

    /**
     *  @notice set staking helper contract
     *  @param stakingHelper_ address
     */
    function setStakingHelper( address stakingHelper_) external onlyOwner() {
        require( stakingHelper_ != address(0) );
        stakingHelper = stakingHelper_;
        emit StakingHelperChanged(stakingHelper);
    }

    function updateApprovedSender(address sender) external onlyOwner() {
      approvedSender = sender;
    }




    /* ======== USER FUNCTIONS ======== */

    /**
     *  @notice deposit bond
     *  @param amount_ uint
     *  @param maxPrice_ uint
     *  @param depositor_ address
     *  @return uint
     */
    function deposit(
        uint amount_,
        uint maxPrice_,
        address depositor_
    ) external returns ( uint ) {
        require( depositor_ != address(0), "Invalid address" );
        require( canSendFor(msg.sender, depositor_), "Depositor: Sender not allowed" );

        decayDebt();
        require( totalDebt <= terms.maxDebt, "Max capacity reached" );

        uint priceInUSD = bondPriceInUSD(); // Stored in bond info
        uint nativePrice = _bondPrice();

        require( maxPrice_ >= nativePrice, "Slippage limit: more than max price" ); // slippage protection

        uint value = ITreasury( treasury ).valueOf( principle, amount_ );
        uint payout = payoutFor( value ); // payout to bonder is computed

        require( payout >= 1e7, "Bond too small" ); // must be > 0.01 SCR ( underflow protection )
        require( payout <= maxPayout(), "Bond too large"); // size protection because there is no slippage

        // profits are calculated
        uint fee = payout.mul( terms.fee ).div( 1e4 );
        uint profit = value.sub( payout ).sub( fee );

        // total debt is increased
        totalDebt = totalDebt.add( value );

        // depositor info is stored
        bondInfo[ depositor_ ] = Bond({
            payout: bondInfo[ depositor_ ].payout.add( payout ),
            vesting: terms.vestingTerm,
            lastTime: uint32(block.timestamp),
            pricePaid: priceInUSD
        });

        // indexed events are emitted
        emit BondCreated( amount_, payout, block.timestamp.add( terms.vestingTerm ), priceInUSD );
        emit BondPriceChanged( bondPriceInUSD(), _bondPrice(), debtRatio() );

        adjust(); // control variable is adjusted

        /**
            principle is transferred in
            approved and
            deposited into the treasury, returning (amount_ - profit) OHM
         */
        IERC20( principle ).safeTransferFrom( msg.sender, address(this), amount_ );
        require( IERC20( principle ).approve( address( treasury ), amount_ ) );
        require( ITreasury( treasury ).deposit( amount_, principle, profit ) == payout );

        if ( fee != 0 ) { // fee is transferred to dao
            IERC20( SCR ).safeTransfer( DAO, fee );
        }

        return payout;
    }

    /**
     *  @notice redeem bond for user
     *  @param recipient_ address
     *  @param stake_ bool
     *  @return uint
     */
    function redeem( address recipient_, bool stake_ ) external returns ( uint ) {
        require( canSendFor(msg.sender, recipient_), "Recipient: Sender not allowed" );

        Bond memory info = bondInfo[ recipient_ ];
        // (seconds since last interaction / vesting term remaining)
        uint percentVested = percentVestedFor( recipient_ );
        uint payout;
        uint remaining;
        if ( percentVested >= 1e4 ) { // if fully vested
            delete bondInfo[ recipient_ ]; // delete user info
            payout = info.payout;
            remaining = 0;
        } else { // if unfinished
            // calculate payout vested
            payout = info.payout.mul( percentVested ).div( 1e4 );
            // store updated deposit info
            bondInfo[ recipient_ ] = Bond({
                payout: info.payout.sub( payout ),
                vesting: uint32( info.vesting.sub( uint32( block.timestamp ).sub( info.lastTime ) ) ),
                lastTime: uint32(block.timestamp),
                pricePaid: info.pricePaid
            });

            remaining = bondInfo[recipient_].payout;
        }

        emit BondRedeemed( recipient_, info.payout, remaining ); // emit bond data
        return stakeOrSend( recipient_, stake_, info.payout ); // pay user everything due
    }




    /* ======== INTERNAL HELPER FUNCTIONS ======== */

    function useHelper() internal returns ( bool ) {
      return IStaking(staking).warmupPeriod() == 0;
    }

    /**
     *  @notice allow user to stake payout automatically
     *  @param stake_ bool
     *  @param amount_ uint
     *  @return uint
     */
    function stakeOrSend( address recipient_, bool stake_, uint amount_ ) internal returns ( uint ) {
        if ( !stake_ ) { // if user does not want to stake
            IERC20( SCR ).safeTransfer( recipient_, amount_ ); // send payout
        } else { // if user wants to stake
            if ( useHelper() ) { // use if staking warmup is 0
                require( IERC20( SCR ).approve( stakingHelper, amount_ ) );
                IStakingHelper( stakingHelper ).stake( amount_, recipient_ );
            } else {
                require( IERC20( SCR ).approve( staking, amount_ ) );
                require ( IStaking( staking ).stake( amount_, recipient_ ) );
            }
        }
        return amount_;
    }

    /**
     *  @notice makes incremental adjustment to control variable
     */
    function adjust() internal {
        uint timeCanAdjust = adjustment.lastTime.add( adjustment.buffer );
        if ( adjustment.rate == 0 || block.timestamp < timeCanAdjust ) {
            return;
        }

        uint temp = terms.controlVariable;
        uint initial = terms.controlVariable;
        if ( adjustment.add ) {
            if ( terms.controlVariable.add( adjustment.rate ) <= adjustment.target ) {
                terms.controlVariable = terms.controlVariable.add( adjustment.rate );
            } else {
                terms.controlVariable = adjustment.target;
            }

            if ( terms.controlVariable >= adjustment.target ) {
                adjustment.rate = 0;
            }
        } else {
            if ( terms.controlVariable.sub( adjustment.rate ) >= adjustment.target ) {
                terms.controlVariable = terms.controlVariable.sub( adjustment.rate );
            } else {
                terms.controlVariable = adjustment.target;
            }

            if ( terms.controlVariable <= adjustment.target ) {
                adjustment.rate = 0;
            }
        }

        adjustment.lastTime = uint32(block.timestamp);
        uint diff;
        if ( terms.controlVariable > temp ) {
          diff = terms.controlVariable.sub(temp);
        } else {
          diff = temp.sub(terms.controlVariable);
        }
        emit ControlVariableAdjustment( initial, terms.controlVariable, diff, adjustment.add );
    }

    /**
     *  @notice reduce total debt
     */
    function decayDebt() internal {
        totalDebt = totalDebt.sub( amountDecay() );
        lastDecay = uint32(block.timestamp);
    }

    /**
     *  @notice calculate current bond price and remove floor if above
     *  @return price_ uint
     */
    function _bondPrice() internal returns ( uint price_ ) {
        price_ = terms.controlVariable.mul( debtRatio() ).add( 1e9 ).div( 1e7 );
        if ( price_ < terms.minimumPrice ) {
            price_ = terms.minimumPrice;
        }
    }




    /* ======== VIEW FUNCTIONS ======== */

    /**
     *  @notice debt ratio in same terms as reserve bonds
     *  @return uint
     */
    function standardizedDebtRatio() external view returns ( uint ) {
        return debtRatio().mul(
            uint( IBondingCalculator(bondCalculator).assetPrice(principle) )
        ).div( 10**IBondingCalculator(bondCalculator).priceDecimals(principle) );
    }

    /**
     *  @notice calculate amount of OHM available for claim by depositor
     *  @param depositor_ address
     *  @return pendingPayout_ uint
     */
    function pendingPayoutFor( address depositor_ ) external view returns ( uint pendingPayout_ ) {
        uint percentVested = percentVestedFor( depositor_ );
        uint payout = bondInfo[ depositor_ ].payout;

        if ( percentVested >= 1e4 ) {
            pendingPayout_ = payout;
        } else {
            pendingPayout_ = payout.mul( percentVested ).div( 1e4 );
        }
    }

    /**
     *  @notice determine maximum bond size
     *  @return uint
     */
    function maxPayout() public view returns ( uint ) {
        return IERC20( SCR ).totalSupply().mul( terms.maxPayout ).div( 1e5 );
    }

    /**
     *  @notice calculate interest due for new bond
     *  @param value_ uint
     *  @return uint
     */
    function payoutFor( uint value_ ) public view returns ( uint ) {
        return value_.mul(1e2).div(bondPrice());
    }

    /**
     *  @notice calculate current bond premium
     *  @return price_ uint
     */
    function bondPrice() public view returns ( uint price_ ) {
        // Bond Price has to be at least 2 RESERVE otherwise there is no profit
        price_ = terms.controlVariable.mul( debtRatio() ).add( 2e9 ).div( 1e7 );
        if ( price_ < terms.minimumPrice ) {
            price_ = terms.minimumPrice;
        }
    }

    /**
     *  @notice converts bond price to DAI value
     *  @return price_ uint
     */
    function bondPriceInUSD() public view returns ( uint price_ ) {
        uint value = ITreasury( treasury ).valueOf( principle, 10 ** IERC20Extended(principle).decimals() );
        uint payout = payoutFor( value ); // payout to bonder is computed

        return value.mul(1e18).div(payout);
    }

    /**
     *  @notice calculate current ratio of debt to OHM supply
     *  @return debtRatio_ uint
     */
    function debtRatio() public view returns ( uint debtRatio_ ) {
        uint supply = IERC20( SCR ).totalSupply();
        debtRatio_ = FixedPoint.fraction(
            currentDebt().mul( 1e9 ),
            supply
        ).decode112with18().div( 1e18 );
    }

    /**
     *  @notice calculate debt factoring in decay
     *  @return uint
     */
    function currentDebt() public view returns ( uint ) {
        return totalDebt.sub( amountDecay() );
    }

    /**
     *  @notice amount to decay total debt by
     *  @return decay_ uint
     */
    function amountDecay() public view returns ( uint decay_ ) {
        uint32 timeSinceLast = uint32( uint32(block.timestamp).sub( lastDecay ) );
        decay_ = totalDebt.mul( timeSinceLast ).div( terms.vestingTerm );
        decay_ = Math.min(decay_, totalDebt);
    }

    /**
     *  @notice calculate how far into vesting a depositor is
     *  @param depositor_ address
     *  @return percentVested_ uint
     */
    function percentVestedFor( address depositor_ ) public view returns ( uint percentVested_ ) {
        Bond memory bond = bondInfo[ depositor_ ];
        uint secondsSinceLast = uint32(block.timestamp).sub( bond.lastTime );
        uint vesting = bond.vesting;

        if ( vesting > 0 ) {
            percentVested_ = secondsSinceLast.mul( 1e4 ).div( vesting );
        } else {
            percentVested_ = 0;
        }
    }

    function canSendFor( address sender, address depositor ) public view returns ( bool ) {
      return sender == depositor || sender == approvedSender;
    }




    /* ======= AUXILLIARY ======= */

    /**
     *  @notice allow anyone to send lost tokens (excluding principle or OHM) to the DAO
     *  @return bool
     */
    function recoverLostToken( address token_ ) external returns ( bool ) {
        require( token_ != SCR );
        require( token_ != principle );
        IERC20( token_ ).safeTransfer( DAO, IERC20( token_ ).balanceOf( address(this) ) );
        return true;
    }
}

