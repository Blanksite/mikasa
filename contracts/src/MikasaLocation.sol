// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MikasaMembership} from "./MikasaMembership.sol";

/// @title MikasaLocation — place/event pins tied to community membership
contract MikasaLocation {
    struct Location {
        string name;
        string locationLabel;
        int256 latE6;
        int256 lngE6;
        address creator;
        uint256 memberCount;
        uint256 checkInCount;
        bool exists;
    }

    MikasaMembership public immutable membership;

    uint256 public locationCount;
    mapping(uint256 => Location) public locations;
    mapping(uint256 => mapping(address => bool)) public isMember;

    event LocationCreated(
        uint256 indexed locationId,
        string name,
        address indexed creator,
        int256 latE6,
        int256 lngE6
    );
    event LocationJoined(uint256 indexed locationId, address indexed member);
    event CheckedIn(uint256 indexed locationId, address indexed actor, uint8 kind, uint256 repAwarded);

    error NotRegistered();
    error InvalidLocation();
    error AlreadyMember();
    error NotLocationMember();

    constructor(address membership_) {
        membership = MikasaMembership(membership_);
    }

    function createLocation(
        string calldata name,
        string calldata locationLabel,
        int256 latE6,
        int256 lngE6
    ) external returns (uint256 locationId) {
        membership.ensureRegistered(msg.sender);

        locationId = ++locationCount;
        locations[locationId] = Location({
            name: name,
            locationLabel: locationLabel,
            latE6: latE6,
            lngE6: lngE6,
            creator: msg.sender,
            memberCount: 1,
            checkInCount: 0,
            exists: true
        });
        isMember[locationId][msg.sender] = true;

        membership.addReputation(msg.sender, membership.REP_JOIN());

        emit LocationCreated(locationId, name, msg.sender, latE6, lngE6);
        emit LocationJoined(locationId, msg.sender);
    }

    function joinLocation(uint256 locationId) external {
        Location storage loc = locations[locationId];
        if (!loc.exists) revert InvalidLocation();
        (bool registered,,,,,) = membership.getMember(msg.sender);
        if (!registered) revert NotRegistered();
        if (isMember[locationId][msg.sender]) revert AlreadyMember();

        isMember[locationId][msg.sender] = true;
        loc.memberCount += 1;
        membership.addReputation(msg.sender, membership.REP_JOIN());
        emit LocationJoined(locationId, msg.sender);
    }

    /// @param kind 0=check-in (+5), 1=complete activity (+10), 2=community event (+15)
    function checkIn(uint256 locationId, uint8 kind) external {
        Location storage loc = locations[locationId];
        if (!loc.exists) revert InvalidLocation();
        if (!isMember[locationId][msg.sender]) revert NotLocationMember();

        uint256 award = membership.REP_CHECKIN();
        if (kind == 1) award = membership.REP_ACTIVITY();
        else if (kind == 2) award = membership.REP_EVENT();

        loc.checkInCount += 1;
        membership.addReputation(msg.sender, award);
        emit CheckedIn(locationId, msg.sender, kind, award);
    }

    function getLocation(uint256 locationId)
        external
        view
        returns (
            string memory name,
            string memory locationLabel,
            int256 latE6,
            int256 lngE6,
            address creator,
            uint256 memberCount,
            uint256 checkInCount
        )
    {
        Location storage loc = locations[locationId];
        if (!loc.exists) revert InvalidLocation();
        return (
            loc.name,
            loc.locationLabel,
            loc.latE6,
            loc.lngE6,
            loc.creator,
            loc.memberCount,
            loc.checkInCount
        );
    }
}
