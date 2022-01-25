contract PriceFeed {
  uint public decimals;
  uint public price;

  constructor(uint decimals_, uint price_) {
    decimals = decimals_;
    price = price_;
  }

  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
      return (0, int256(price), 0, 0, 0);
    }
}
