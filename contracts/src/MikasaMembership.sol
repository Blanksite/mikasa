// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MikasaMembership — identity, reputation, tier, voting power
/// @notice Reputation is only increased by authorized Mikasa modules (never EOAs).
contract MikasaMembership {
    enum Tier {
        Visitor,
        Member,
        Contributor,
        Steward,
        Guardian
    }

    struct Member {
        bool registered;
        uint256 reputation;
        uint256 contributionCount;
        uint64 joinedAt;
    }

    uint256 public constant REP_CHECKIN = 5;
    uint256 public constant REP_ACTIVITY = 10; // complete activity
    uint256 public constant REP_EVENT = 15; // join community event
    uint256 public constant REP_JOIN = 100; // Blitz: joining/founding a location → Member tier
    uint256 public constant REP_PROPOSE = 10;
    uint256 public constant REP_FUND = 5;
    uint256 public constant REP_VERIFY = 5;
    uint256 public constant REP_COMPLETE = 50;

    /// @dev Legacy alias — older modules may still call REP_RUN()
    function REP_RUN() external pure returns (uint256) {
        return REP_ACTIVITY;
    }

    address public owner;
    mapping(address => bool) public modules;
    mapping(address => Member) public members;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ModuleSet(address indexed module, bool allowed);
    event Registered(address indexed user, uint64 joinedAt);
    event ReputationAdded(address indexed user, uint256 amount, uint256 newTotal, address indexed caller);
    event ContributionBumped(address indexed user, uint256 newCount);

    error NotOwner();
    error NotModule();
    error AlreadyRegistered();
    error NotRegistered();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyModule() {
        if (!modules[msg.sender]) revert NotModule();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setModule(address module, bool allowed) external onlyOwner {
        if (module == address(0)) revert ZeroAddress();
        modules[module] = allowed;
        emit ModuleSet(module, allowed);
    }

    function register() external {
        Member storage m = members[msg.sender];
        if (m.registered) revert AlreadyRegistered();
        m.registered = true;
        m.joinedAt = uint64(block.timestamp);
        emit Registered(msg.sender, m.joinedAt);
    }

    /// @dev Modules may register a user implicitly (e.g. first location create)
    function ensureRegistered(address user) external onlyModule {
        Member storage m = members[user];
        if (m.registered) return;
        m.registered = true;
        m.joinedAt = uint64(block.timestamp);
        emit Registered(user, m.joinedAt);
    }

    function addReputation(address user, uint256 amount) external onlyModule {
        Member storage m = members[user];
        if (!m.registered) revert NotRegistered();
        m.reputation += amount;
        emit ReputationAdded(user, amount, m.reputation, msg.sender);
    }

    function bumpContribution(address user) external onlyModule {
        Member storage m = members[user];
        if (!m.registered) revert NotRegistered();
        m.contributionCount += 1;
        emit ContributionBumped(user, m.contributionCount);
    }

    function tierOf(address user) public view returns (Tier) {
        uint256 r = members[user].reputation;
        if (r >= 1500) return Tier.Guardian;
        if (r >= 700) return Tier.Steward;
        if (r >= 300) return Tier.Contributor;
        if (r >= 100) return Tier.Member;
        return Tier.Visitor;
    }

    function votingPower(address user) public view returns (uint256) {
        if (!members[user].registered) return 0;
        Tier t = tierOf(user);
        if (t == Tier.Guardian) return 5;
        if (t == Tier.Steward) return 3;
        if (t == Tier.Contributor) return 2;
        if (t == Tier.Member) return 1;
        return 0; // Visitor
    }

    function canPropose(address user) public view returns (bool) {
        return members[user].registered && uint8(tierOf(user)) >= uint8(Tier.Member);
    }

    function canVote(address user) public view returns (bool) {
        return votingPower(user) > 0;
    }

    function canFund(address user) public view returns (bool) {
        return members[user].registered && uint8(tierOf(user)) >= uint8(Tier.Member);
    }

    function canManage(address user) public view returns (bool) {
        return members[user].registered && uint8(tierOf(user)) >= uint8(Tier.Steward);
    }

    function getMember(address user)
        external
        view
        returns (
            bool registered,
            uint256 reputation,
            uint256 contributionCount,
            uint64 joinedAt,
            Tier tier,
            uint256 power
        )
    {
        Member memory m = members[user];
        return (m.registered, m.reputation, m.contributionCount, m.joinedAt, tierOf(user), votingPower(user));
    }
}
