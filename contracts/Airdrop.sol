pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Airdrop is Ownable {
  struct Batch {
    address[] receivers;
    uint256[] amounts;
    bool sent;
  }

  IERC20 token;
  uint256 maxBatchSize = 20;
  mapping(uint256=>Batch) batches;

  constructor(address _token) {
    token = IERC20(_token);
  }

  function setBatch(uint256 _batch, address[] calldata _receivers, uint256[] calldata _amounts) public onlyOwner {
    require(_receivers.length == _amounts.length);
    batches[_batch] = Batch(
      _receivers,
      _amounts,
      false
    );
  }

  function sendBatch(uint256 _batch) public onlyOwner {
    Batch memory batch = batches[_batch];
    require(!batch.sent, "batch already sent");
    batches[_batch].sent = true;

    for (uint256 i = 0; i < batch.receivers.length; i++) {
      token.transfer(batch.receivers[i], batch.amounts[i]);
    }
  }
}
