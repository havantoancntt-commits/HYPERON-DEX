import fs from 'fs';
import path from 'path';
import solc from 'solc';

function findImports(importPath: string) {
  if (importPath.startsWith('@openzeppelin/')) {
    const fullPath = path.resolve('node_modules', importPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
  }
  const localPath = path.resolve('contracts', importPath);
  if (fs.existsSync(localPath)) {
    return { contents: fs.readFileSync(localPath, 'utf8') };
  }
  return { error: 'File not found: ' + importPath };
}

const contractSource = fs.readFileSync(path.resolve('contracts/HyperonToken.sol'), 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'HyperonToken.sol': {
      content: contractSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log('Compiling HyperonToken.sol with solc...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err: any) => {
    console.log(err.formattedMessage);
    if (err.severity === 'error') hasError = true;
  });
  if (hasError) process.exit(1);
}

const contract = output.contracts['HyperonToken.sol']['HyperonToken'];
const bytecode = contract.evm.bytecode.object;
const abi = contract.abi;

console.log('Compilation succeeded! Bytecode length:', bytecode.length);

const artifactTs = `// Auto-generated Hyperon Token Artifact
export const HYPERON_TOKEN_SOLIDITY_SOURCE = ${JSON.stringify(contractSource)};

export const HYPERON_TOKEN_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const HYPERON_TOKEN_BYTECODE = "0x${bytecode}" as const;
`;

fs.mkdirSync('src/contracts', { recursive: true });
fs.writeFileSync('src/contracts/HyperonTokenArtifact.ts', artifactTs, 'utf8');
console.log('Saved to src/contracts/HyperonTokenArtifact.ts');
