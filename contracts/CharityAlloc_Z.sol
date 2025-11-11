pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract CharityAlloc_Z is ZamaEthereumConfig {
    struct CharityAllocation {
        string charityId;
        euint32 encryptedScore;
        uint256 publicValue1;
        uint256 publicValue2;
        string description;
        address creator;
        uint256 timestamp;
        uint32 decryptedScore;
        bool isVerified;
    }

    mapping(string => CharityAllocation) public charityAllocations;
    string[] public charityIds;

    event AllocationCreated(string indexed charityId, address indexed creator);
    event DecryptionVerified(string indexed charityId, uint32 decryptedScore);

    constructor() ZamaEthereumConfig() {}

    function createAllocation(
        string calldata charityId,
        externalEuint32 encryptedScore,
        bytes calldata inputProof,
        uint256 publicValue1,
        uint256 publicValue2,
        string calldata description
    ) external {
        require(bytes(charityAllocations[charityId].charityId).length == 0, "Allocation already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedScore, inputProof)), "Invalid encrypted input");

        charityAllocations[charityId] = CharityAllocation({
            charityId: charityId,
            encryptedScore: FHE.fromExternal(encryptedScore, inputProof),
            publicValue1: publicValue1,
            publicValue2: publicValue2,
            description: description,
            creator: msg.sender,
            timestamp: block.timestamp,
            decryptedScore: 0,
            isVerified: false
        });

        FHE.allowThis(charityAllocations[charityId].encryptedScore);
        FHE.makePubliclyDecryptable(charityAllocations[charityId].encryptedScore);
        charityIds.push(charityId);

        emit AllocationCreated(charityId, msg.sender);
    }

    function verifyDecryption(
        string calldata charityId, 
        bytes memory abiEncodedClearScore,
        bytes memory decryptionProof
    ) external {
        require(bytes(charityAllocations[charityId].charityId).length > 0, "Allocation does not exist");
        require(!charityAllocations[charityId].isVerified, "Data already verified");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(charityAllocations[charityId].encryptedScore);

        FHE.checkSignatures(cts, abiEncodedClearScore, decryptionProof);
        uint32 decodedScore = abi.decode(abiEncodedClearScore, (uint32));

        charityAllocations[charityId].decryptedScore = decodedScore;
        charityAllocations[charityId].isVerified = true;

        emit DecryptionVerified(charityId, decodedScore);
    }

    function getEncryptedScore(string calldata charityId) external view returns (euint32) {
        require(bytes(charityAllocations[charityId].charityId).length > 0, "Allocation does not exist");
        return charityAllocations[charityId].encryptedScore;
    }

    function getAllocationData(string calldata charityId) external view returns (
        uint256 publicValue1,
        uint256 publicValue2,
        string memory description,
        address creator,
        uint256 timestamp,
        bool isVerified,
        uint32 decryptedScore
    ) {
        require(bytes(charityAllocations[charityId].charityId).length > 0, "Allocation does not exist");
        CharityAllocation storage data = charityAllocations[charityId];

        return (
            data.publicValue1,
            data.publicValue2,
            data.description,
            data.creator,
            data.timestamp,
            data.isVerified,
            data.decryptedScore
        );
    }

    function getAllCharityIds() external view returns (string[] memory) {
        return charityIds;
    }

    function calculateAllocation(
        string calldata charityId,
        euint32 encryptedTotalAmount
    ) external view returns (euint32) {
        require(bytes(charityAllocations[charityId].charityId).length > 0, "Allocation does not exist");
        require(charityAllocations[charityId].isVerified, "Score not verified");

        return FHE.mul(
            encryptedTotalAmount,
            charityAllocations[charityId].encryptedScore
        );
    }

    function isAvailable() public pure returns (bool) {
        return true;
    }
}


