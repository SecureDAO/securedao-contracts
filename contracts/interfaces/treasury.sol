// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface ITreasury {
    enum MANAGING {
        RESERVEDEPOSITOR,
        RESERVESPENDER,
        RESERVETOKEN,
        RESERVEMANAGER,
        LIQUIDITYDEPOSITOR,
        LIQUIDITYTOKEN,
        LIQUIDITYMANAGER,
        DEBTOR,
        REWARDMANAGER,
        SSCR
    }

    function queue(MANAGING _managing, address _address) external returns (bool);
    function toggle(MANAGING _managing, address _address, address _calculator) external returns (bool);
    function pushManagement(address _newOwner) external;
    function pullManagement() external;
    function manager() external returns (address);
    function secondsNeededForQueue() external returns (uint32);
    function deposit(
        uint256 _amount,
        address _token,
        uint256 _profit
    ) external returns (uint256 send_);

    function valueOf(address _token, uint256 _amount)
        external
        view
        returns (uint256 value_);
}

