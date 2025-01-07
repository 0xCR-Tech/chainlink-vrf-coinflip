// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import { IVRFCoordinatorV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import { VRFV2PlusClient } from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";


contract CoinFlip is VRFConsumerBaseV2Plus {
    // Events
    event FlipResult(address indexed player, uint256 amount, bool won, uint256 result);
    event FeeWalletChanged(address indexed newWallet);
    event FundsAdded(address indexed admin, uint256 amount);
    event FundsRemoved(address indexed admin, uint256 amount);

    // State variables
    address public admin;
    address public feeWallet;
    uint256 public feePercent = 35; // 3.5% fee (in basis points, 35 = 3.5%)
    uint256 public maxBet;
    uint256 public houseBalance;

    struct Flip {
        address player;
        uint256 amount;
        bool won;
        uint256 result;
    }

    struct RequestStatus {
        bool fulfilled; 
        bool exists;
        uint256[] randomWords;
    }

    mapping(uint256 => RequestStatus) public s_requests;
    uint256 public lastRequestId;

    Flip[] public flips;

    // Chainlink VRF parameters
    IVRFCoordinatorV2Plus internal immutable COORDINATOR;
    bytes32 internal immutable KEY_HASH;
    uint256 private immutable SUBSCRIPTION_ID;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant CALLBACK_GAS_LIMIT = 300000;
    uint32 private constant NUM_WORDS = 1;

    mapping(uint256 => address) private requests;
    mapping(address => uint256) private pendingBets;

    constructor(
        address vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _feeWallet,
        uint256 _maxBet
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        admin = msg.sender;
        feeWallet = _feeWallet;
        SUBSCRIPTION_ID = _subscriptionId;
        KEY_HASH = _keyHash;
        maxBet = _maxBet;

        COORDINATOR = IVRFCoordinatorV2Plus(vrfCoordinator);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function changeFeeWallet(address newWallet) external onlyAdmin {
        require(newWallet != address(0), "Invalid wallet");
        feeWallet = newWallet;
        emit FeeWalletChanged(newWallet);
    }

    function addFunds() external payable onlyAdmin {
        require(msg.value > 0, "No funds sent");
        houseBalance += msg.value;
        emit FundsAdded(msg.sender, msg.value);
    }

    function removeFunds(uint256 amount) external onlyAdmin {
        require(amount <= houseBalance, "Not enough funds");
        houseBalance -= amount;
        payable(admin).transfer(amount);
        emit FundsRemoved(msg.sender, amount);
    }

    function setMaxBet(uint256 _maxBet) external onlyAdmin {
        maxBet = _maxBet;
    }

    function requestRandomWords(
        bool enableNativePayment
    ) internal returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: KEY_HASH,
                subId: SUBSCRIPTION_ID,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: enableNativePayment
                    })
                )
            })
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        return requestId;
    }
    function flipCoin() external payable {
        require(msg.value > 0, "Bet amount must be greater than zero");
        require(msg.value <= maxBet, "Bet exceeds max limit");
        require(msg.value <= houseBalance / 2, "House cannot cover this bet");

        uint256 requestId = requestRandomWords(true);
        lastRequestId = requestId;
        requests[requestId] = msg.sender;
        pendingBets[msg.sender] = msg.value;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        address player = requests[requestId];
        uint256 betAmount = pendingBets[player];
        require(betAmount > 0, "No active bet");

        require(s_requests[requestId].exists, "request not found");
        s_requests[requestId].fulfilled = true;
        s_requests[requestId].randomWords = randomWords;

        delete requests[requestId];
        delete pendingBets[player];

        uint256 result = randomWords[0] % 2;
        bool won = (result == 1);
        uint256 payout = 0;

        if (won) {
            payout = (betAmount * 2 * (1000 - feePercent)) / 1000; // Calculate payout after fee
            houseBalance -= payout;
            payable(player).transfer(payout);
        } else {
            houseBalance += betAmount;
        }

        flips.push(Flip({
            player: player,
            amount: betAmount,
            won: won,
            result: result
        }));

        emit FlipResult(player, betAmount, won, result);
    }

    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    function getFlipHistory() external view returns (Flip[] memory) {
        return flips;
    }

    function getHouseBalance() external view returns (uint256) {
        return houseBalance;
    }

    receive() external payable {
        houseBalance += msg.value;
    }
}
