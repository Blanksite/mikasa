// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MikasaMembership} from "../src/MikasaMembership.sol";
import {MikasaLocation} from "../src/MikasaLocation.sol";
import {MikasaTreasury} from "../src/MikasaTreasury.sol";
import {MikasaProposal} from "../src/MikasaProposal.sol";

/// @dev forge script script/DeployMikasa.s.sol:DeployMikasa --rpc-url monad_testnet --broadcast
contract DeployMikasa is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MikasaMembership membership = new MikasaMembership();
        MikasaLocation locations = new MikasaLocation(address(membership));
        MikasaTreasury treasury = new MikasaTreasury();
        MikasaProposal proposals =
            new MikasaProposal(address(membership), address(locations), address(treasury));

        membership.setModule(address(locations), true);
        membership.setModule(address(proposals), true);
        treasury.setProposalModule(address(proposals));

        vm.stopBroadcast();

        console2.log("VITE_MEMBERSHIP_ADDRESS=", address(membership));
        console2.log("VITE_LOCATION_ADDRESS=", address(locations));
        console2.log("VITE_TREASURY_ADDRESS=", address(treasury));
        console2.log("VITE_PROPOSAL_ADDRESS=", address(proposals));
    }
}
