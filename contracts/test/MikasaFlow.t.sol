// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MikasaMembership} from "../src/MikasaMembership.sol";
import {MikasaLocation} from "../src/MikasaLocation.sol";
import {MikasaTreasury} from "../src/MikasaTreasury.sol";
import {MikasaProposal} from "../src/MikasaProposal.sol";

contract MikasaFlowTest is Test {
    MikasaMembership membership;
    MikasaLocation locations;
    MikasaTreasury treasury;
    MikasaProposal proposals;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        membership = new MikasaMembership();
        locations = new MikasaLocation(address(membership));
        treasury = new MikasaTreasury();
        proposals = new MikasaProposal(address(membership), address(locations), address(treasury));

        membership.setModule(address(locations), true);
        membership.setModule(address(proposals), true);
        treasury.setProposalModule(address(proposals));

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function testFullFlow() public {
        vm.prank(alice);
        membership.register();

        vm.prank(alice);
        uint256 locId = locations.createLocation("Kebun Raya", "Bogor loop", -6597600, 106799600);
        assertEq(uint8(membership.tierOf(alice)), uint8(MikasaMembership.Tier.Member));

        vm.prank(bob);
        membership.register();
        vm.prank(bob);
        locations.joinLocation(locId);

        vm.prank(alice);
        locations.checkIn(locId, 1); // run

        uint16[] memory bps = new uint16[](3);
        bps[0] = 3000;
        bps[1] = 4000;
        bps[2] = 3000;

        vm.prank(alice);
        uint256 propId = proposals.createProposal(
            locId, "Water station", "Refill point", 1 ether, bps, 1 days
        );

        vm.prank(bob);
        proposals.vote(propId, true);

        vm.prank(alice);
        proposals.closeVoting(propId);

        (,,,,,,,,, MikasaProposal.Status status,) = proposals.getProposal(propId);
        assertEq(uint8(status), uint8(MikasaProposal.Status.Funding));

        vm.prank(bob);
        proposals.contribute{value: 1 ether}(propId);

        (,,,,, uint256 raised,,,, MikasaProposal.Status status2,) = proposals.getProposal(propId);
        assertEq(raised, 1 ether);
        assertEq(uint8(status2), uint8(MikasaProposal.Status.Execution));

        vm.prank(alice);
        proposals.submitProof(propId, 0, "bafyDemoCidMilestone1");

        uint256 aliceBefore = alice.balance;
        vm.prank(bob);
        proposals.verifyMilestone(propId, 0);

        assertEq(alice.balance, aliceBefore + 0.3 ether);

        vm.prank(alice);
        proposals.submitProof(propId, 1, "bafyDemoCidMilestone2");
        vm.prank(bob);
        proposals.verifyMilestone(propId, 1);

        vm.prank(alice);
        proposals.submitProof(propId, 2, "bafyDemoCidMilestone3");
        vm.prank(bob);
        proposals.verifyMilestone(propId, 2);

        (,,,,,,,,, MikasaProposal.Status done,) = proposals.getProposal(propId);
        assertEq(uint8(done), uint8(MikasaProposal.Status.Completed));
    }
}
