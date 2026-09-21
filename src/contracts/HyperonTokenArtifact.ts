// Auto-generated Hyperon Token Artifact
export const HYPERON_TOKEN_SOLIDITY_SOURCE = "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\n\nimport \"@openzeppelin/contracts/token/ERC20/ERC20.sol\";\nimport \"@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol\";\nimport \"@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol\";\nimport \"@openzeppelin/contracts/access/Ownable.sol\";\n\n/**\n * @title HyperonToken (HYPR)\n * @author HYPERON Institutional Quantitative Protocol\n * @notice The canonical native utility, governance, and fee-discount token of HYPERON-DEX.\n * \n * Key Tokenomics & Security Highlights:\n * - Fixed Hard Cap: Exactly 1,000,000,000 HYPR (1 Billion tokens).\n * - No Minting Backdoor: The total supply is minted in full to the deployer at genesis.\n * - Burnable: Supports decentralized on-chain fee burn via ERC20Burnable.\n * - Gasless Permits: EIP-2612 permit functionality enabled for zero-gas DEX approvals.\n * - No Transfer Taxes / No Blacklist: 100% decentralized, 100/100 CertiK / GoPlus DeFi score.\n */\ncontract HyperonToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {\n    uint256 public constant TOTAL_SUPPLY_CAP = 1_000_000_000 * 10 ** 18; // 1,000,000,000 HYPR\n\n    event GenesisDistributed(address indexed treasury, uint256 amount);\n\n    constructor(address initialOwner)\n        ERC20(\"Hyperon\", \"HYPR\")\n        ERC20Permit(\"Hyperon\")\n        Ownable(initialOwner)\n    {\n        require(initialOwner != address(0), \"Invalid initial owner\");\n        _mint(initialOwner, TOTAL_SUPPLY_CAP);\n        emit GenesisDistributed(initialOwner, TOTAL_SUPPLY_CAP);\n    }\n}\n";

export const HYPERON_TOKEN_FLATTENED_SOURCE = HYPERON_TOKEN_SOLIDITY_SOURCE;

export const HYPERON_TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "allowance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "ERC2612ExpiredSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ERC2612InvalidSigner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "currentNonce",
        "type": "uint256"
      }
    ],
    "name": "InvalidAccountNonce",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "GenesisDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOTAL_SUPPLY_CAP",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "burnFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "nonces",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "permit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const HYPERON_TOKEN_BYTECODE = "0x610160604052348015610010575f5ffd5b5060405161176a38038061176a83398101604081905261002f91610490565b8060405180604001604052806007815260200166243cb832b937b760c91b81525080604051806040016040528060018152602001603160f81b81525060405180604001604052806007815260200166243cb832b937b760c91b81525060405180604001604052806004815260200163242ca82960e11b81525081600390816100b79190610555565b5060046100c48282610555565b506100d491508390506005610272565b610120526100e3816006610272565b61014052815160208084019190912060e052815190820120610100524660a05261016f60e05161010051604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201529081019290925260608201524660808201523060a08201525f9060c00160405160208183030381529060405280519060200120905090565b60805250503060c052506001600160a01b0381166101a757604051631e4fbdf760e01b81525f60048201526024015b60405180910390fd5b6101b0816102a4565b506001600160a01b0381166102075760405162461bcd60e51b815260206004820152601560248201527f496e76616c696420696e697469616c206f776e65720000000000000000000000604482015260640161019e565b61021d816b033b2e3c9fd0803ce80000006102f5565b806001600160a01b03167f1263f861dbb61061abeadcebf1c881e6373b55ec4c3d2e8904eca1c9b016f5396b033b2e3c9fd0803ce800000060405161026491815260200190565b60405180910390a250610686565b5f60208351101561028d576102868361032d565b905061029e565b816102988482610555565b5060ff90505b92915050565b600880546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a35050565b6001600160a01b03821661031e5760405163ec442f0560e01b81525f600482015260240161019e565b6103295f838361036a565b5050565b5f5f829050601f81511115610357578260405163305a27a960e01b815260040161019e919061060f565b805161036282610644565b179392505050565b6001600160a01b038316610394578060025f8282546103899190610667565b909155506104049050565b6001600160a01b0383165f90815260208190526040902054818110156103e65760405163391434e360e21b81526001600160a01b0385166004820152602481018290526044810183905260640161019e565b6001600160a01b0384165f9081526020819052604090209082900390555b6001600160a01b0382166104205760028054829003905561043e565b6001600160a01b0382165f9081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161048391815260200190565b60405180910390a3505050565b5f602082840312156104a0575f5ffd5b81516001600160a01b03811681146104b6575f5ffd5b9392505050565b634e487b7160e01b5f52604160045260245ffd5b600181811c908216806104e557607f821691505b60208210810361050357634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561055057805f5260205f20601f840160051c8101602085101561052e5750805b601f840160051c820191505b8181101561054d575f815560010161053a565b50505b505050565b81516001600160401b0381111561056e5761056e6104bd565b6105828161057c84546104d1565b84610509565b6020601f8211600181146105b4575f831561059d5750848201515b5f19600385901b1c1916600184901b17845561054d565b5f84815260208120601f198516915b828110156105e357878501518255602094850194600190920191016105c3565b508482101561060057868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b602081525f82518060208401528060208501604085015e5f604082850101526040601f19601f83011684010191505092915050565b80516020808301519190811015610503575f1960209190910360031b1b16919050565b8082018082111561029e57634e487b7160e01b5f52601160045260245ffd5b60805160a05160c05160e0516101005161012051610140516110936106d75f395f6108c701525f61089a01525f61079101525f61076901525f6106c401525f6106ee01525f61071801526110935ff3fe608060405234801561000f575f5ffd5b506004361061011c575f3560e01c8063715018a6116100a957806395d89b411161006e57806395d89b4114610251578063a9059cbb14610259578063d505accf1461026c578063dd62ed3e1461027f578063f2fde38b146102b7575f5ffd5b8063715018a6146101ed57806379cc6790146101f55780637ecebe001461020857806384b0196e1461021b5780638da5cb5b14610236575f5ffd5b8063313ce567116100ef578063313ce567146101865780633644e5151461019557806342966c681461019d57806348931352146101b257806370a08231146101c5575f5ffd5b806306fdde0314610120578063095ea7b31461013e57806318160ddd1461016157806323b872dd14610173575b5f5ffd5b6101286102ca565b6040516101359190610df8565b60405180910390f35b61015161014c366004610e2c565b61035a565b6040519015158152602001610135565b6002545b604051908152602001610135565b610151610181366004610e54565b610373565b60405160128152602001610135565b610165610396565b6101b06101ab366004610e8e565b6103a4565b005b6101656b033b2e3c9fd0803ce800000081565b6101656101d3366004610ea5565b6001600160a01b03165f9081526020819052604090205490565b6101b06103b1565b6101b0610203366004610e2c565b6103c4565b610165610216366004610ea5565b6103dd565b6102236103fa565b6040516101359796959493929190610ebe565b6008546040516001600160a01b039091168152602001610135565b61012861043c565b610151610267366004610e2c565b61044b565b6101b061027a366004610f54565b610458565b61016561028d366004610fc1565b6001600160a01b039182165f90815260016020908152604080832093909416825291909152205490565b6101b06102c5366004610ea5565b610593565b6060600380546102d990610ff2565b80601f016020809104026020016040519081016040528092919081815260200182805461030590610ff2565b80156103505780601f1061032757610100808354040283529160200191610350565b820191905f5260205f20905b81548152906001019060200180831161033357829003601f168201915b5050505050905090565b5f336103678185856105cd565b60019150505b92915050565b5f336103808582856105df565b61038b85858561065b565b506001949350505050565b5f61039f6106b8565b905090565b6103ae33826107e1565b50565b6103b9610815565b6103c25f610842565b565b6103cf8233836105df565b6103d982826107e1565b5050565b6001600160a01b0381165f9081526007602052604081205461036d565b5f6060805f5f5f606061040b610893565b6104136108c0565b604080515f80825260208201909252600f60f81b9b939a50919850469750309650945092509050565b6060600480546102d990610ff2565b5f3361036781858561065b565b834211156104815760405163313c898160e11b8152600481018590526024015b60405180910390fd5b5f7f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886104cc8c6001600160a01b03165f90815260076020526040902080546001810190915590565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e0016040516020818303038152906040528051906020012090505f610526826108ed565b90505f61053582878787610919565b9050896001600160a01b0316816001600160a01b03161461057c576040516325c0072360e11b81526001600160a01b0380831660048301528b166024820152604401610478565b6105878a8a8a6105cd565b50505050505050505050565b61059b610815565b6001600160a01b0381166105c457604051631e4fbdf760e01b81525f6004820152602401610478565b6103ae81610842565b6105da8383836001610945565b505050565b6001600160a01b038381165f908152600160209081526040808320938616835292905220545f19811015610655578181101561064757604051637dc7a0d960e11b81526001600160a01b03841660048201526024810182905260448101839052606401610478565b61065584848484035f610945565b50505050565b6001600160a01b03831661068457604051634b637e8f60e11b81525f6004820152602401610478565b6001600160a01b0382166106ad5760405163ec442f0560e01b81525f6004820152602401610478565b6105da838383610a17565b5f306001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001614801561071057507f000000000000000000000000000000000000000000000000000000000000000046145b1561073a57507f000000000000000000000000000000000000000000000000000000000000000090565b61039f604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f0000000000000000000000000000000000000000000000000000000000000000918101919091527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a08201525f9060c00160405160208183030381529060405280519060200120905090565b6001600160a01b03821661080a57604051634b637e8f60e11b81525f6004820152602401610478565b6103d9825f83610a17565b6008546001600160a01b031633146103c25760405163118cdaa760e01b8152336004820152602401610478565b600880546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a35050565b606061039f7f00000000000000000000000000000000000000000000000000000000000000006005610b3d565b606061039f7f00000000000000000000000000000000000000000000000000000000000000006006610b3d565b5f61036d6108f96106b8565b8360405161190160f01b8152600281019290925260228201526042902090565b5f5f5f5f61092988888888610be6565b9250925092506109398282610cae565b50909695505050505050565b6001600160a01b03841661096e5760405163e602df0560e01b81525f6004820152602401610478565b6001600160a01b03831661099757604051634a1406b160e11b81525f6004820152602401610478565b6001600160a01b038085165f908152600160209081526040808320938716835292905220829055801561065557826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92584604051610a0991815260200190565b60405180910390a350505050565b6001600160a01b038316610a41578060025f828254610a36919061102a565b90915550610ab19050565b6001600160a01b0383165f9081526020819052604090205481811015610a935760405163391434e360e21b81526001600160a01b03851660048201526024810182905260448101839052606401610478565b6001600160a01b0384165f9081526020819052604090209082900390555b6001600160a01b038216610acd57600280548290039055610aeb565b6001600160a01b0382165f9081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610b3091815260200190565b60405180910390a3505050565b606060ff8314610b5757610b5083610d66565b905061036d565b818054610b6390610ff2565b80601f0160208091040260200160405190810160405280929190818152602001828054610b8f90610ff2565b8015610bda5780601f10610bb157610100808354040283529160200191610bda565b820191905f5260205f20905b815481529060010190602001808311610bbd57829003601f168201915b5050505050905061036d565b5f80807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610c1f57505f91506003905082610ca4565b604080515f808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610c70573d5f5f3e3d5ffd5b5050604051601f1901519150506001600160a01b038116610c9b57505f925060019150829050610ca4565b92505f91508190505b9450945094915050565b5f826003811115610cc157610cc1611049565b03610cca575050565b6001826003811115610cde57610cde611049565b03610cfc5760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610d1057610d10611049565b03610d315760405163fce698f760e01b815260048101829052602401610478565b6003826003811115610d4557610d45611049565b036103d9576040516335e2f38360e21b815260048101829052602401610478565b60605f610d7283610da3565b6040805160208082528183019092529192505f91906020820181803683375050509182525060208101929092525090565b5f60ff8216601f81111561036d57604051632cd44ac360e21b815260040160405180910390fd5b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b602081525f610e0a6020830184610dca565b9392505050565b80356001600160a01b0381168114610e27575f5ffd5b919050565b5f5f60408385031215610e3d575f5ffd5b610e4683610e11565b946020939093013593505050565b5f5f5f60608486031215610e66575f5ffd5b610e6f84610e11565b9250610e7d60208501610e11565b929592945050506040919091013590565b5f60208284031215610e9e575f5ffd5b5035919050565b5f60208284031215610eb5575f5ffd5b610e0a82610e11565b60ff60f81b8816815260e060208201525f610edc60e0830189610dca565b8281036040840152610eee8189610dca565b606084018890526001600160a01b038716608085015260a0840186905283810360c0850152845180825260208087019350909101905f5b81811015610f43578351835260209384019390920191600101610f25565b50909b9a5050505050505050505050565b5f5f5f5f5f5f5f60e0888a031215610f6a575f5ffd5b610f7388610e11565b9650610f8160208901610e11565b95506040880135945060608801359350608088013560ff81168114610fa4575f5ffd5b9699959850939692959460a0840135945060c09093013592915050565b5f5f60408385031215610fd2575f5ffd5b610fdb83610e11565b9150610fe960208401610e11565b90509250929050565b600181811c9082168061100657607f821691505b60208210810361102457634e487b7160e01b5f52602260045260245ffd5b50919050565b8082018082111561036d57634e487b7160e01b5f52601160045260245ffd5b634e487b7160e01b5f52602160045260245ffdfea264697066735822122079de5a7735dd2d96c8427d602c3f4b8c7fdb3fb909a2abcfa4a15725484a7d3564736f6c634300081c0033" as const;
