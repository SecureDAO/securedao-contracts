// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import "./interfaces/ido.sol";

interface IStaking {
    function stake(uint256 _amount, address _recipient) external returns (bool);
    function claim(address _recipient) external;
}

contract IDO is IIDO, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Length of the private sale in seconds
    uint256 constant public privateSaleSeconds = 1 days;
    // Length of the public sale in seconds
    uint256 constant public publicSaleSeconds = 1 days;

    // Assumes a reserve token with 18 decimals
    address immutable public override reserve;
    address immutable public staking;
    address immutable public override finalizer;

    // Amount (in wei) that can be purchased during the public sale
    uint256 immutable public publicSaleAmount;
    // Total amount of native tokens for purchase
    uint256 immutable public override totalAmount;
    // Reserve (in wei) per 1e9 native IE 100*1e18 is 100 reserve for 1 native
    uint256 immutable public override salePrice;

    address public native;

    // Start time (in Unix epoch seconds) of the sale
    uint256 public startOfSale;
    // Block when the public sale was opened
    uint256 public startOfPublicSale;
    uint256 public override amountRemaining;
    // Total number of addresses in the whitelist
    uint256 public totalWhiteListed;
    uint256 public claimedAmount;
    uint256 public numBuyers;

    bool public initialized;
    bool public whiteListEnabled;
    bool public cancelled;
    bool public finalized;
    bool public saleClosed;

    mapping(address => bool) public bought;
    mapping(address => bool) public whiteListed;

    address[] public buyers;
    mapping(address => uint256) public purchasedAmounts;

    constructor(
        address reserve_,
        address staking_,
        address finalizer_,
        uint256 totalAmount_,
        uint256 salePrice_,
        uint256 startOfSale_,
        uint256 publicSaleAmount_
    ) {
        require(reserve_ != address(0));
        require(staking_ != address(0));
        require(finalizer_ != address(0));

        reserve = reserve_;
        staking = staking_;
        finalizer = finalizer_;
        totalAmount = totalAmount_;
        amountRemaining = totalAmount_;
        salePrice = salePrice_;
        startOfSale = startOfSale_;
        publicSaleAmount = publicSaleAmount_;
    }

    /// @dev Only Emergency Use
    /// cancel the IDO and return the funds to all buyers
    function cancel() external onlyOwner {
        require(!saleClosed);
        cancelled = true;
        startOfSale = 99999999999;
    }

    function whiteListBuyers(address[] memory buyers_)
        external
        onlyOwner
        returns (bool)
    {
        require(!saleStarted(), "Already started");

        totalWhiteListed = totalWhiteListed.add(buyers_.length);

        for (uint256 i = 0; i < buyers_.length; i++) {
            whiteListed[buyers_[i]] = true;
        }

        return true;
    }

    // onlyFinalizer

    function finalize(address native_) external override {
        require(msg.sender == finalizer, "Can only be called by the finalizer");

        require(native_ != address(0), "Native cannot be 0");
        require(saleClosed, "Sale must be closed");
        require(!finalized, "Already finalized");
        finalized = true;
        native = native_;
        require(IERC20(native).balanceOf(address(this)) == (totalAmount-amountRemaining), "Did not receive the correct number of native tokens");
    }

    function closeSale() external override {
        require(msg.sender == finalizer, "Can only be called by the approved caller");

        closeSaleRequirements();
        require(!saleClosed, "Sale already closed");
        saleClosed = true;

        IERC20(reserve).safeTransfer(
            msg.sender,
            IERC20(reserve).balanceOf(address(this))
        );
    }


    // public or external view

    function saleStarted() public view returns (bool) {
        return initialized;
    }

    function getAllotmentPerBuyer() public view returns (uint256) {
        if (whiteListEnabled) {
            return amountRemaining.div(totalWhiteListed);
        } else {
            return Math.min(publicSaleAmount, amountRemaining);
        }
    }

    function calculateSaleQuote(uint256 paymentAmount_)
        external
        view
        returns (uint256)
    {
        return _calculateSaleQuote(paymentAmount_);
    }

    // public or external

    // Start the private sale
    function initialize() external {
        require(block.timestamp >= startOfSale, "Cannot start sale yet");
        cancelled = false;
        finalized = false;
        initialized = true;
        whiteListEnabled = true;
    }

    // Start the public sale
    function disableWhiteList() external {
        require(block.timestamp >= (startOfSale + privateSaleSeconds), "Cannot start public sale yet");
        whiteListEnabled = false;
        startOfPublicSale = block.timestamp;
    }

    function purchase(uint256 amount) external returns (bool) {
        require(saleStarted(), "Not started");
        require(!saleClosed, "Sale is closed");
        require(
            !whiteListEnabled || whiteListed[msg.sender],
            "Not whitelisted"
        );
        require(!bought[msg.sender], "Already participated");
        require(amount > 0, "Amount must be > 0");
        uint256 purchaseAmount = _calculateSaleQuote(amount);
        require(purchaseAmount <= getAllotmentPerBuyer(), "More than allotted");

        bought[msg.sender] = true;

        if (whiteListEnabled) {
            totalWhiteListed = totalWhiteListed.sub(1);
        }

        amountRemaining = amountRemaining.sub(purchaseAmount);

        purchasedAmounts[msg.sender] = purchaseAmount;
        buyers.push(msg.sender);
        numBuyers = buyers.length;

        IERC20(reserve).safeTransferFrom(msg.sender, address(this), amount);

        return true;
    }

    function claim() external {
        address recipient = msg.sender;
        require(finalized, "Can only claim after IDO has been finalized");
        require(purchasedAmounts[recipient] > 0, "None purchased");

        uint256 amt = purchasedAmounts[recipient];
        purchasedAmounts[recipient] = 0;
        claimedAmount += amt;
        approveIfNeeded(native, staking, amt);
        assert(IStaking(staking).stake(amt, recipient));
        IStaking(staking).claim(recipient);
    }

    function withdraw() external {
        require(cancelled, "Ido is not cancelled");
        uint256 amount = purchasedAmounts[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        purchasedAmounts[msg.sender] = 0;
        IERC20(reserve).safeTransfer(msg.sender, (amount * salePrice) / 1e9);
    }

    // internal view

    function _calculateSaleQuote(uint256 paymentAmount_)
        internal
        view
        returns (uint256)
    {
        return uint256(1e9).mul(paymentAmount_).div(salePrice);
    }

    function closeSaleRequirements() internal view {
      require(startOfPublicSale > 0, "Public sale not started");
      require(block.timestamp > (startOfPublicSale + publicSaleSeconds), "Sale not finished yet");
    }

    // internal

    function approveIfNeeded(address token, address spender, uint256 amount) internal {
        if (IERC20(token).allowance(address(this), spender) < amount) {
            assert(IERC20(token).approve(spender, amount));
        }
    }
}
