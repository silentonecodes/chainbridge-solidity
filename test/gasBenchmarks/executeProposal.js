/**
 * Copyright 2020 ChainSafe Systems
 * SPDX-License-Identifier: LGPL-3.0-only
 */
const Ethers = require('ethers');

const Helpers = require('../helpers');

const BridgeContract = artifacts.require("Bridge");
const ERC20HandlerContract = artifacts.require("ERC20Handler");
const ERC20MintableContract = artifacts.require("ERC20PresetMinterPauser");
const ERC721HandlerContract = artifacts.require("ERC721Handler");
const ERC721MintableContract = artifacts.require("ERC721MinterBurnerPauser");
const GenericHandlerContract = artifacts.require("GenericHandler");
const CentrifugeAssetContract = artifacts.require("CentrifugeAsset");
const NoArgumentContract = artifacts.require("NoArgument");
const OneArgumentContract = artifacts.require("OneArgument");
const TwoArgumentsContract = artifacts.require("TwoArguments");
const ThreeArgumentsContract = artifacts.require("ThreeArguments");

contract('Gas Benchmark - [Execute Proposal]', async (accounts) => {
    const chainID = 1;
    const relayerThreshold = 1;
    const relayerAddress = accounts[0];
    const depositerAddress = accounts[1];
    const recipientAddress = accounts[2];
    const lenRecipientAddress = 32;
    const gasBenchmarks = [];

    const initialRelayers = [relayerAddress];
    const erc20TokenAmount = 100;
    const erc721TokenID = 1;

    let BridgeInstance;
    let ERC20MintableInstance;
    let ERC20HandlerInstance;
    let ERC721MintableInstance;
    let ERC721HandlerInstance;
    let CentrifugeAssetInstance;
    let NoArgumentInstance;
    let OneArgumentInstance;
    let TwoArgumentsInstance;
    let ThreeArgumentsInstance;

    let erc20ResourceID;
    let erc721ResourceID;
    let centrifugeAssetResourceID;
    let noArgumentResourceID;
    let oneArgumentResourceID;
    let twoArgumentsResourceID;
    let threeArgumentsResourceID;

    const deposit = (resourceID, depositData) => BridgeInstance.deposit(chainID, resourceID, depositData, { from: depositerAddress });
    const vote = (resourceID, depositNonce, depositDataHash) => BridgeInstance.voteProposal(chainID, depositNonce, resourceID, depositDataHash, { from: relayerAddress });
    const execute = (depositNonce, depositData) => BridgeInstance.executeProposal(chainID, depositNonce, depositData);

    before(async () => {
        await Promise.all([
            BridgeContract.new(chainID, initialRelayers, relayerThreshold, 0).then(instance => BridgeInstance = instance),
            ERC20MintableContract.new("token", "TOK").then(instance => ERC20MintableInstance = instance),
            ERC721MintableContract.new("token", "TOK", "").then(instance => ERC721MintableInstance = instance),
            CentrifugeAssetContract.new().then(instance => CentrifugeAssetInstance = instance),
            NoArgumentContract.new().then(instance => NoArgumentInstance = instance),
            OneArgumentContract.new().then(instance => OneArgumentInstance = instance),
            TwoArgumentsContract.new().then(instance => TwoArgumentsInstance = instance),
            ThreeArgumentsContract.new().then(instance => ThreeArgumentsInstance = instance)
        ]);

        erc20ResourceID = Helpers.createResourceID(ERC20MintableInstance.address, chainID);
        erc721ResourceID = Helpers.createResourceID(ERC721MintableInstance.address, chainID);
        centrifugeAssetResourceID = Helpers.createResourceID(CentrifugeAssetInstance.address, chainID);
        noArgumentResourceID = Helpers.createResourceID(NoArgumentInstance.address, chainID);
        oneArgumentResourceID = Helpers.createResourceID(OneArgumentInstance.address, chainID);
        twoArgumentsResourceID = Helpers.createResourceID(TwoArgumentsInstance.address, chainID);
        threeArgumentsResourceID = Helpers.createResourceID(ThreeArgumentsInstance.address, chainID);

        const erc20InitialResourceIDs = [erc20ResourceID];
        const erc20InitialContractAddresses = [ERC20MintableInstance.address];
        const erc20BurnableContractAddresses = [];

        const erc721InitialResourceIDs = [erc721ResourceID];
        const erc721InitialContractAddresses = [ERC721MintableInstance.address];
        const erc721BurnableContractAddresses = [];

        const genericInitialResourceIDs = [
            centrifugeAssetResourceID,
            noArgumentResourceID,
            oneArgumentResourceID,
            twoArgumentsResourceID,
            threeArgumentsResourceID];
        const genericInitialContractAddresses = initialContractAddresses = [
            CentrifugeAssetInstance.address,
            NoArgumentInstance.address,
            OneArgumentInstance.address,
            TwoArgumentsInstance.address,
            ThreeArgumentsInstance.address];
        const genericInitialDepositFunctionSignatures = [
            Helpers.blankFunctionSig,
            Helpers.getFunctionSignature(NoArgumentInstance, 'noArgument'),
            Helpers.getFunctionSignature(OneArgumentInstance, 'oneArgument'),
            Helpers.getFunctionSignature(TwoArgumentsInstance, 'twoArguments'),
            Helpers.getFunctionSignature(ThreeArgumentsInstance, 'threeArguments')];
        const genericInitialExecuteFunctionSignatures = [
            Helpers.getFunctionSignature(CentrifugeAssetInstance, 'store'),
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig,
            Helpers.blankFunctionSig];

        await Promise.all([
            ERC20HandlerContract.new(BridgeInstance.address, erc20InitialResourceIDs, erc20InitialContractAddresses, erc20BurnableContractAddresses).then(instance => ERC20HandlerInstance = instance),
            ERC20MintableInstance.mint(depositerAddress, erc20TokenAmount),
            ERC721HandlerContract.new(BridgeInstance.address, erc721InitialResourceIDs, erc721InitialContractAddresses, erc721BurnableContractAddresses).then(instance => ERC721HandlerInstance = instance),
            ERC721MintableInstance.mint(depositerAddress, erc721TokenID, ""),
            GenericHandlerInstance = await GenericHandlerContract.new(BridgeInstance.address, genericInitialResourceIDs, genericInitialContractAddresses, genericInitialDepositFunctionSignatures, genericInitialExecuteFunctionSignatures)
        ]);

        await Promise.all([
            ERC20MintableInstance.approve(ERC20HandlerInstance.address, erc20TokenAmount, { from: depositerAddress }),
            ERC721MintableInstance.approve(ERC721HandlerInstance.address, erc721TokenID, { from: depositerAddress }),
            BridgeInstance.adminSetHandlerAddress(ERC20HandlerInstance.address, erc20ResourceID),
            BridgeInstance.adminSetHandlerAddress(ERC721HandlerInstance.address, erc721ResourceID),
            BridgeInstance.adminSetHandlerAddress(GenericHandlerInstance.address, centrifugeAssetResourceID),
            BridgeInstance.adminSetHandlerAddress(GenericHandlerInstance.address, noArgumentResourceID),
            BridgeInstance.adminSetHandlerAddress(GenericHandlerInstance.address, oneArgumentResourceID),
            BridgeInstance.adminSetHandlerAddress(GenericHandlerInstance.address, twoArgumentsResourceID),
            BridgeInstance.adminSetHandlerAddress(GenericHandlerInstance.address, threeArgumentsResourceID)
        ]);
    });

    it('Should execute ERC20 deposit proposal', async () => {
        const depositNonce = 1;
        const depositData = Helpers.createERCDepositData(
            erc20ResourceID,
            erc20TokenAmount,
            lenRecipientAddress,
            recipientAddress);
        const depositDataHash = Ethers.utils.keccak256(ERC20HandlerInstance.address + depositData.substr(2));

        await deposit(erc20ResourceID, depositData);
        await vote(erc20ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'ERC20',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute ERC721 deposit proposal', async () => {
        const depositNonce = 2;
        const lenMetaData = 0;
        const metaData = 0;
        const depositData = Helpers.createERC721DepositProposalData(
            erc721ResourceID,
            erc721TokenID,
            lenRecipientAddress,
            recipientAddress,
            lenMetaData,
            metaData);
        const depositDataHash = Ethers.utils.keccak256(ERC721HandlerInstance.address + depositData.substr(2));

        await deposit(erc721ResourceID, depositData);
        await vote(erc721ResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'ERC721',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute Generic deposit proposal - Centrifuge asset', async () => {
        const depositNonce = 3;
        const hashOfCentrifugeAsset = Ethers.utils.keccak256('0xc0ffee');
        const depositData = Helpers.createGenericDepositData(centrifugeAssetResourceID, hashOfCentrifugeAsset);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2));

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'Generic - Centrifuge Asset',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should execute Generic deposit proposal - No Argument', async () => {
        const depositNonce = 4;
        const depositData = Helpers.createGenericDepositData(noArgumentResourceID, null);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2));

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'Generic - No Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - One Argument', async () => {
        const depositNonce = 5;
        const depositData = Helpers.createGenericDepositData(oneArgumentResourceID, Helpers.toHex(42, 32));
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2));

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'Generic - One Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - Two Arguments', async () => {
        const depositNonce = 6;
        const argumentOne = [NoArgumentInstance.address, OneArgumentInstance.address, TwoArgumentsInstance.address];
        const argumentTwo = Helpers.getFunctionSignature(CentrifugeAssetInstance, 'store');
        const encodedMetaData = Helpers.abiEncode(['address[]','bytes4'], [argumentOne, argumentTwo]);
        const depositData = Helpers.createGenericDepositData(twoArgumentsResourceID, encodedMetaData);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2));

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'Generic - Two Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });

    it('Should make Generic deposit - Three Arguments', async () => {
        const depositNonce = 7;
        const argumentOne = 'soylentGreenIsPeople';
        const argumentTwo = -42;
        const argumentThree = true;
        const encodedMetaData = Helpers.abiEncode(['string','int8','bool'], [argumentOne, argumentTwo, argumentThree]);
        const depositData = Helpers.createGenericDepositData(threeArgumentsResourceID, encodedMetaData);
        const depositDataHash = Ethers.utils.keccak256(GenericHandlerInstance.address + depositData.substr(2));

        await deposit(centrifugeAssetResourceID, depositData);
        await vote(centrifugeAssetResourceID, depositNonce, depositDataHash, relayerAddress);

        const executeTx = await execute(depositNonce, depositData);

        gasBenchmarks.push({
            type: 'Generic - Three Argument',
            gasUsed: executeTx.receipt.gasUsed
        });
    });
    
    it('Should print out benchmarks', () => console.table(gasBenchmarks));
});
