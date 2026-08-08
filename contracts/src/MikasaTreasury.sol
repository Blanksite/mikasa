// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MikasaTreasury — holds MON pots and proposal escrow; releases milestones
contract MikasaTreasury {
    address public owner;
    address public proposalModule;

    mapping(uint256 => uint256) public locationPot;
    mapping(uint256 => uint256) public proposalEscrow;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProposalModuleSet(address indexed module);
    event LocationDeposited(uint256 indexed locationId, address indexed from, uint256 amount);
    event EscrowCredited(uint256 indexed proposalId, address indexed from, uint256 amount, uint256 total);
    event MilestoneReleased(
        uint256 indexed proposalId,
        uint256 indexed milestoneId,
        address indexed to,
        uint256 amount
    );

    error NotOwner();
    error NotProposal();
    error ZeroAddress();
    error NothingSent();
    error InsufficientEscrow();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProposal() {
        if (msg.sender != proposalModule) revert NotProposal();
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

    function setProposalModule(address module) external onlyOwner {
        if (module == address(0)) revert ZeroAddress();
        proposalModule = module;
        emit ProposalModuleSet(module);
    }

    function deposit(uint256 locationId) external payable {
        if (msg.value == 0) revert NothingSent();
        locationPot[locationId] += msg.value;
        emit LocationDeposited(locationId, msg.sender, msg.value);
    }

    function creditEscrow(uint256 proposalId) external payable onlyProposal {
        if (msg.value == 0) revert NothingSent();
        proposalEscrow[proposalId] += msg.value;
        emit EscrowCredited(proposalId, tx.origin, msg.value, proposalEscrow[proposalId]);
    }

    function releaseMilestone(uint256 proposalId, uint256 milestoneId, address to, uint256 amount)
        external
        onlyProposal
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount > proposalEscrow[proposalId]) revert InsufficientEscrow();
        proposalEscrow[proposalId] -= amount;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit MilestoneReleased(proposalId, milestoneId, to, amount);
    }
}
