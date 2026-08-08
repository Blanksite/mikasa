// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MikasaMembership} from "./MikasaMembership.sol";
import {MikasaLocation} from "./MikasaLocation.sol";
import {MikasaTreasury} from "./MikasaTreasury.sol";

/// @title MikasaProposal — vote → fund → milestone proof → verify → release
contract MikasaProposal {
    enum Status {
        Voting,
        Approved,
        Rejected,
        Funding,
        Execution,
        Completed
    }

    struct Proposal {
        uint256 locationId;
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 raised;
        uint256 yesPower;
        uint256 noPower;
        uint64 deadline;
        Status status;
        uint8 milestoneCount;
        bool exists;
    }

    struct Milestone {
        uint16 bps;
        string ipfsCid;
        bool proven;
        bool released;
        uint256 yesVerifies;
    }

    MikasaMembership public immutable membership;
    MikasaLocation public immutable locations;
    MikasaTreasury public immutable treasury;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVerifiedMilestone;

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed locationId,
        address indexed creator,
        uint256 goal,
        uint64 deadline
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 power);
    event VotingClosed(uint256 indexed proposalId, Status status);
    event Contributed(uint256 indexed proposalId, address indexed contributor, uint256 amount, uint256 raised);
    event ProofSubmitted(uint256 indexed proposalId, uint256 indexed milestoneId, string ipfsCid);
    event MilestoneVerified(uint256 indexed proposalId, uint256 indexed milestoneId, address indexed verifier);
    event ProposalCompleted(uint256 indexed proposalId);

    error NotAllowed();
    error InvalidLocation();
    error InvalidProposal();
    error InvalidStatus();
    error InvalidMilestones();
    error AlreadyVoted();
    error AlreadyVerified();
    error NothingSent();
    error NotCreator();
    error NotProven();
    error AlreadyReleased();
    error VotingOpen();
    error GoalZero();

    constructor(address membership_, address locations_, address treasury_) {
        membership = MikasaMembership(membership_);
        locations = MikasaLocation(locations_);
        treasury = MikasaTreasury(treasury_);
    }

    function createProposal(
        uint256 locationId,
        string calldata title,
        string calldata description,
        uint256 goalWei,
        uint16[] calldata milestoneBps,
        uint64 votingPeriodSeconds
    ) external returns (uint256 proposalId) {
        if (!membership.canPropose(msg.sender)) revert NotAllowed();
        if (goalWei == 0) revert GoalZero();
        if (!locations.isMember(locationId, msg.sender)) revert NotAllowed();
        // ensure location exists
        locations.getLocation(locationId);

        uint256 bpsSum;
        uint256 len = milestoneBps.length;
        if (len == 0 || len > 5) revert InvalidMilestones();
        for (uint256 i; i < len; i++) {
            bpsSum += milestoneBps[i];
        }
        if (bpsSum != 10_000) revert InvalidMilestones();

        uint64 period = votingPeriodSeconds == 0 ? 3 days : votingPeriodSeconds;
        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            locationId: locationId,
            creator: msg.sender,
            title: title,
            description: description,
            goal: goalWei,
            raised: 0,
            yesPower: 0,
            noPower: 0,
            deadline: uint64(block.timestamp) + period,
            status: Status.Voting,
            milestoneCount: uint8(len),
            exists: true
        });

        for (uint256 i; i < len; i++) {
            milestones[proposalId][i] = Milestone({
                bps: milestoneBps[i],
                ipfsCid: "",
                proven: false,
                released: false,
                yesVerifies: 0
            });
        }

        membership.addReputation(msg.sender, membership.REP_PROPOSE());
        emit ProposalCreated(proposalId, locationId, msg.sender, goalWei, proposals[proposalId].deadline);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (p.status != Status.Voting) revert InvalidStatus();
        if (block.timestamp > p.deadline) revert InvalidStatus();
        if (!membership.canVote(msg.sender)) revert NotAllowed();
        if (!locations.isMember(p.locationId, msg.sender)) revert NotAllowed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 power = membership.votingPower(msg.sender);
        hasVoted[proposalId][msg.sender] = true;
        if (support) p.yesPower += power;
        else p.noPower += power;

        emit Voted(proposalId, msg.sender, support, power);
    }

    function closeVoting(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (p.status != Status.Voting) revert InvalidStatus();

        bool pastDeadline = block.timestamp >= p.deadline;
        bool earlyPass = p.yesPower > p.noPower && p.yesPower >= 1;
        if (!pastDeadline && !earlyPass) revert VotingOpen();

        if (p.yesPower > p.noPower) {
            p.status = Status.Funding;
            emit VotingClosed(proposalId, Status.Approved);
            emit VotingClosed(proposalId, Status.Funding);
        } else {
            p.status = Status.Rejected;
            emit VotingClosed(proposalId, Status.Rejected);
        }
    }

    function contribute(uint256 proposalId) external payable {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (p.status != Status.Funding && p.status != Status.Execution) revert InvalidStatus();
        if (msg.value == 0) revert NothingSent();
        if (!membership.canFund(msg.sender)) revert NotAllowed();
        if (!locations.isMember(p.locationId, msg.sender)) revert NotAllowed();

        // Move to Funding→Execution when first money arrives if still Funding
        if (p.status == Status.Funding) {
            // stay Funding until goal; still accept
        }

        treasury.creditEscrow{value: msg.value}(proposalId);
        p.raised += msg.value;
        membership.addReputation(msg.sender, membership.REP_FUND());
        membership.bumpContribution(msg.sender);

        emit Contributed(proposalId, msg.sender, msg.value, p.raised);

        if (p.raised >= p.goal && p.status == Status.Funding) {
            p.status = Status.Execution;
        }
    }

    function submitProof(uint256 proposalId, uint256 milestoneId, string calldata ipfsCid) external {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (p.status != Status.Execution && p.status != Status.Funding) revert InvalidStatus();
        if (p.raised < p.goal) revert InvalidStatus();
        if (msg.sender != p.creator && !membership.canManage(msg.sender)) revert NotCreator();
        if (milestoneId >= p.milestoneCount) revert InvalidMilestones();

        Milestone storage m = milestones[proposalId][milestoneId];
        if (m.released) revert AlreadyReleased();

        m.ipfsCid = ipfsCid;
        m.proven = true;
        if (p.status == Status.Funding) p.status = Status.Execution;
        emit ProofSubmitted(proposalId, milestoneId, ipfsCid);
    }

    function verifyMilestone(uint256 proposalId, uint256 milestoneId) external {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (p.status != Status.Execution) revert InvalidStatus();
        if (milestoneId >= p.milestoneCount) revert InvalidMilestones();
        if (!membership.canVote(msg.sender)) revert NotAllowed();
        if (!locations.isMember(p.locationId, msg.sender)) revert NotAllowed();
        if (msg.sender == p.creator) revert NotAllowed();
        if (hasVerifiedMilestone[proposalId][milestoneId][msg.sender]) revert AlreadyVerified();

        Milestone storage m = milestones[proposalId][milestoneId];
        if (!m.proven) revert NotProven();
        if (m.released) revert AlreadyReleased();

        hasVerifiedMilestone[proposalId][milestoneId][msg.sender] = true;
        m.yesVerifies += 1;
        membership.addReputation(msg.sender, membership.REP_VERIFY());
        emit MilestoneVerified(proposalId, milestoneId, msg.sender);

        // Blitz: 1 community verify releases the milestone
        if (m.yesVerifies >= 1) {
            uint256 amount = (p.goal * m.bps) / 10_000;
            m.released = true;
            treasury.releaseMilestone(proposalId, milestoneId, p.creator, amount);

            if (_allReleased(proposalId, p.milestoneCount)) {
                p.status = Status.Completed;
                membership.addReputation(p.creator, membership.REP_COMPLETE());
                emit ProposalCompleted(proposalId);
            }
        }
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 locationId,
            address creator,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 raised,
            uint256 yesPower,
            uint256 noPower,
            uint64 deadline,
            Status status,
            uint8 milestoneCount
        )
    {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        return (
            p.locationId,
            p.creator,
            p.title,
            p.description,
            p.goal,
            p.raised,
            p.yesPower,
            p.noPower,
            p.deadline,
            p.status,
            p.milestoneCount
        );
    }

    function getMilestone(uint256 proposalId, uint256 milestoneId)
        external
        view
        returns (uint16 bps, string memory ipfsCid, bool proven, bool released, uint256 yesVerifies)
    {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert InvalidProposal();
        if (milestoneId >= p.milestoneCount) revert InvalidMilestones();
        Milestone storage m = milestones[proposalId][milestoneId];
        return (m.bps, m.ipfsCid, m.proven, m.released, m.yesVerifies);
    }

    function _allReleased(uint256 proposalId, uint8 count) internal view returns (bool) {
        for (uint256 i; i < count; i++) {
            if (!milestones[proposalId][i].released) return false;
        }
        return true;
    }
}
