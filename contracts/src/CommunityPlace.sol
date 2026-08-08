// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CommunityPlace — Blitz MVP
/// @notice One place → join → propose → micro-contribute MON → proof → verify → reputation
contract CommunityPlace {
    enum ProposalStatus {
        Active,
        Funded,
        Executed,
        Verified,
        Cancelled
    }

    struct Place {
        string name;
        string locationLabel;
        address creator;
        uint256 memberCount;
        uint256 treasury; // unallocated MON held for the place
    }

    struct Proposal {
        uint256 placeId;
        address creator;
        string title;
        string description;
        uint256 goal; // wei
        uint256 raised;
        ProposalStatus status;
        string proofUri;
        string report;
        uint256 yesVotes;
    }

    struct Reputation {
        uint256 contribution;
        uint256 execution;
        bool joined;
    }

    uint256 public placeCount;
    uint256 public proposalCount;

    mapping(uint256 => Place) public places;
    mapping(uint256 => Proposal) public proposals;
    /// placeId => member => reputation
    mapping(uint256 => mapping(address => Reputation)) public reputations;
    /// proposalId => member => has verified
    mapping(uint256 => mapping(address => bool)) public hasVerified;

    event PlaceCreated(uint256 indexed placeId, string name, address indexed creator);
    event MemberJoined(uint256 indexed placeId, address indexed member);
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed placeId,
        address indexed creator,
        uint256 goal
    );
    event Contributed(
        uint256 indexed proposalId,
        address indexed contributor,
        uint256 amount,
        uint256 raised
    );
    event ProposalFunded(uint256 indexed proposalId);
    event ProofSubmitted(uint256 indexed proposalId, string proofUri);
    event ProposalVerified(uint256 indexed proposalId, address indexed verifier);
    event ReputationUpdated(
        uint256 indexed placeId,
        address indexed member,
        uint256 contribution,
        uint256 execution
    );

    error NotMember();
    error InvalidPlace();
    error InvalidProposal();
    error InvalidStatus();
    error GoalZero();
    error NothingSent();
    error AlreadyVerified();
    error AlreadyJoined();

    function createPlace(string calldata name, string calldata locationLabel)
        external
        returns (uint256 placeId)
    {
        placeId = ++placeCount;
        places[placeId] = Place({
            name: name,
            locationLabel: locationLabel,
            creator: msg.sender,
            memberCount: 0,
            treasury: 0
        });
        // creator auto-joins
        reputations[placeId][msg.sender] = Reputation({contribution: 0, execution: 0, joined: true});
        places[placeId].memberCount = 1;

        emit PlaceCreated(placeId, name, msg.sender);
        emit MemberJoined(placeId, msg.sender);
    }

    function joinPlace(uint256 placeId) external {
        if (placeId == 0 || placeId > placeCount) revert InvalidPlace();
        Reputation storage rep = reputations[placeId][msg.sender];
        if (rep.joined) revert AlreadyJoined();

        rep.joined = true;
        places[placeId].memberCount += 1;
        emit MemberJoined(placeId, msg.sender);
    }

    function createProposal(
        uint256 placeId,
        string calldata title,
        string calldata description,
        uint256 goalWei
    ) external returns (uint256 proposalId) {
        if (placeId == 0 || placeId > placeCount) revert InvalidPlace();
        if (!reputations[placeId][msg.sender].joined) revert NotMember();
        if (goalWei == 0) revert GoalZero();

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            placeId: placeId,
            creator: msg.sender,
            title: title,
            description: description,
            goal: goalWei,
            raised: 0,
            status: ProposalStatus.Active,
            proofUri: "",
            report: "",
            yesVotes: 0
        });

        emit ProposalCreated(proposalId, placeId, msg.sender, goalWei);
    }

    /// @notice Micro-contribute native MON toward a proposal goal
    function contribute(uint256 proposalId) external payable {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposal();
        if (msg.value == 0) revert NothingSent();

        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.Active) revert InvalidStatus();

        uint256 placeId = p.placeId;
        if (!reputations[placeId][msg.sender].joined) revert NotMember();

        p.raised += msg.value;
        reputations[placeId][msg.sender].contribution += 1;

        emit Contributed(proposalId, msg.sender, msg.value, p.raised);
        emit ReputationUpdated(
            placeId,
            msg.sender,
            reputations[placeId][msg.sender].contribution,
            reputations[placeId][msg.sender].execution
        );

        if (p.raised >= p.goal) {
            p.status = ProposalStatus.Funded;
            emit ProposalFunded(proposalId);
        }
    }

    function submitProof(uint256 proposalId, string calldata proofUri, string calldata report)
        external
    {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposal();
        Proposal storage p = proposals[proposalId];
        if (p.creator != msg.sender) revert NotMember();
        if (p.status != ProposalStatus.Funded) revert InvalidStatus();

        p.proofUri = proofUri;
        p.report = report;
        p.status = ProposalStatus.Executed;
        emit ProofSubmitted(proposalId, proofUri);
    }

    /// @notice Any place member can verify; first verify completes + bumps creator execution
    function verify(uint256 proposalId) external {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposal();
        Proposal storage p = proposals[proposalId];
        uint256 placeId = p.placeId;

        if (!reputations[placeId][msg.sender].joined) revert NotMember();
        if (p.status != ProposalStatus.Executed) revert InvalidStatus();
        if (hasVerified[proposalId][msg.sender]) revert AlreadyVerified();

        hasVerified[proposalId][msg.sender] = true;
        p.yesVotes += 1;

        // MVP: single member verify is enough to complete
        if (p.status == ProposalStatus.Executed) {
            p.status = ProposalStatus.Verified;
            reputations[placeId][p.creator].execution += 10;
            // move funds to place treasury accounting (ETH still in contract;
            // creator of place can withdraw later — MVP keeps simple)
            places[placeId].treasury += p.raised;

            emit ProposalVerified(proposalId, msg.sender);
            emit ReputationUpdated(
                placeId,
                p.creator,
                reputations[placeId][p.creator].contribution,
                reputations[placeId][p.creator].execution
            );
        }
    }

    /// @notice Place creator withdraws verified treasury (execution payout demo)
    function withdrawTreasury(uint256 placeId, address payable to, uint256 amount) external {
        if (placeId == 0 || placeId > placeCount) revert InvalidPlace();
        Place storage place = places[placeId];
        if (place.creator != msg.sender) revert NotMember();
        if (amount > place.treasury) revert InvalidStatus();

        place.treasury -= amount;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }

    // -------- views --------

    function getPlace(uint256 placeId)
        external
        view
        returns (
            string memory name,
            string memory locationLabel,
            address creator,
            uint256 memberCount,
            uint256 treasury
        )
    {
        Place storage p = places[placeId];
        return (p.name, p.locationLabel, p.creator, p.memberCount, p.treasury);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 placeId,
            address creator,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 raised,
            ProposalStatus status,
            string memory proofUri,
            string memory report,
            uint256 yesVotes
        )
    {
        Proposal storage p = proposals[proposalId];
        return (
            p.placeId,
            p.creator,
            p.title,
            p.description,
            p.goal,
            p.raised,
            p.status,
            p.proofUri,
            p.report,
            p.yesVotes
        );
    }

    function getReputation(uint256 placeId, address member)
        external
        view
        returns (uint256 contribution, uint256 execution, bool joined)
    {
        Reputation storage r = reputations[placeId][member];
        return (r.contribution, r.execution, r.joined);
    }
}
