# Private Charity Allocation

The Private Charity Allocation project is an innovative application designed to allocate funds to charitable initiatives without compromising the identities of recipients. Utilizing Zama's Fully Homomorphic Encryption (FHE) technology, this project ensures that sensitive data remains confidential while still allowing for effective computation. 

## The Problem

In the realm of charitable donations, transparency and accountability are paramount. However, the sharing of cleartext data—such as the identities of recipients and the amounts allocated—poses significant privacy risks. Vulnerable individuals may be exposed to unwanted attention or exploitation, thereby hindering their dignity and the spirit of giving. The existing methods of allocation often fall short, as they may inadvertently disclose private information.

## The Zama FHE Solution

Fully Homomorphic Encryption (FHE) provides a robust framework to address these privacy concerns. By enabling computations on encrypted data, FHE allows the allocation of funds to be calculated without revealing any sensitive information about the recipients. With Zama's powerful libraries, we can securely process encrypted inputs and ensure that recipients' data remains confidential throughout the process. 

Using Zama's fhevm, we can implement a distribution algorithm that assesses the unique needs of each recipient based on encrypted metrics, allowing for precise and privacy-respecting allocations.

## Key Features

- 🔒 **Privacy Preservation**: Ensures that recipient data remains confidential throughout the distribution process.
- ⚖️ **Fair Resource Allocation**: Implements a homomorphic computation algorithm that accurately assigns funds based on encrypted assessments of need.
- 🤝 **Dignified Assistance**: Maintains the dignity of beneficiaries by preventing exposure of their identities and personal circumstances.
- 📊 **Data-Driven Decisions**: Utilizes encrypted data for informed decision-making without compromising on privacy.
- 🌍 **Community Focused**: Aims to enhance community welfare through equitable funding, preserving the trust between donors and recipients.

## Technical Architecture & Stack

The technical foundation of the Private Charity Allocation project is built upon the following core components:

- **Core Privacy Engine**: Zama's FHE (Concrete, fhevm)
- **Programming Languages**: Solidity (for smart contracts), Python (for computation and data handling)
- **Frameworks**: Hardhat (for Ethereum development), Concrete ML (for machine learning tasks)

This stack optimally integrates Zama's FHE capabilities with robust development tools to ensure a seamless and secure application.

## Smart Contract / Core Logic

Here’s a simplified pseudo-code example illustrating how we utilize Zama’s FHE capabilities within a smart contract:solidity
pragma solidity ^0.8.0;

import "pathToZamaLibrary/fhevm";

contract CharityAlloc {
    function allocateFunds(uint64[] encryptedNeeds) public {
        uint64 totalFunds = 10000; // Total funds available
        uint64[] memory allocations = new uint64[](encryptedNeeds.length);
        
        for (uint i = 0; i < encryptedNeeds.length; i++) {
            allocations[i] = TFHE.add(encryptedNeeds[i], totalFunds);
            // Further calculations can be done while maintaining encrypted states
        }
        
        // Decrypt and allocate funds appropriately
        for (uint i = 0; i < allocations.length; i++) {
            uint64 finalAmount = TFHE.decrypt(allocations[i]);
            // Transfer finalAmount to recipient account
        }
    }
}

In this contract, we showcase how encrypted needs are computed, emphasizing the seamless integration of Zama technologies for secure fund allocation.

## Directory Structure
PrivateCharityAllocation/
├── contracts/
│   └── CharityAlloc.sol
├── scripts/
│   ├── main.py
│   └── allocation.py
├── requirements.txt
└── README.md

This structure is designed to organize the project components clearly, ensuring that smart contracts and computation scripts are easily accessible and manageable.

## Installation & Setup

### Prerequisites

Before proceeding, ensure that you have the following installed:

- Node.js
- Python 3.x
- npm (Node package manager)
- pip (Python package installer)

### Installation Steps

1. **Install Dependencies**:
   - For the blockchain components, run:
     npm install
     npm install fhevm
   - For Python components, execute:
     pip install -r requirements.txt
     pip install concrete-ml

This will ensure that all necessary libraries are installed and ready for use.

## Build & Run

To build and run the project, follow these commands:

- **For the Smart Contract**:
  npx hardhat compile
  npx hardhat run scripts/main.py

- **For Python Scripts**:
  python allocation.py

These commands will compile the smart contract and run the necessary Python scripts to demonstrate the project functionality.

## Acknowledgements

We extend our deepest gratitude to Zama for providing the open-source FHE primitives that make this project possible. Their innovations in Fully Homomorphic Encryption empower developers to create secure and privacy-preserving applications that can positively impact society.

---

In summary, the Private Charity Allocation project exemplifies how Zama’s FHE technology can transform the way charitable contributions are distributed while safeguarding the sensitive information of beneficiaries. This application stands as a testament to the future of privacy-centric solutions in the philanthropic sector.


