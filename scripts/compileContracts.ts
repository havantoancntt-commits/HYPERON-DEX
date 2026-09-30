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
  const candidatePaths = [
    path.resolve('contracts', importPath),
    path.resolve('contracts/src', importPath),
    path.resolve('contracts/src', importPath.replace(/^(\.\.\/src\/|\.\/src\/|src\/|contracts_src\/)/, '')),
    path.resolve('contracts/src', importPath.replace(/^\.\//, '')),
    path.resolve('contracts/test', importPath),
    path.resolve(importPath),
  ];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }
  return { error: `File not found: ${importPath}` };
}

export function compileSolidityContracts() {
  console.log('Compiling Solidity contracts with solc', solc.version());
  const sources: Record<string, { content: string }> = {
    'HyperonRouter.sol': {
      content: fs.readFileSync(path.resolve('contracts/HyperonRouter.sol'), 'utf8'),
    },
    'contracts_src/HyperonRouter.sol': {
      content: fs.readFileSync(path.resolve('contracts/src/HyperonRouter.sol'), 'utf8'),
    },
    'HyperonOracleAggregator.sol': {
      content: fs.readFileSync(path.resolve('contracts/HyperonOracleAggregator.sol'), 'utf8'),
    },
    'src/HyperonOracleAggregator.sol': {
      content: fs.readFileSync(path.resolve('contracts/src/HyperonOracleAggregator.sol'), 'utf8'),
    },
    'interfaces/ISwapRouter.sol': {
      content: fs.readFileSync(path.resolve('contracts/src/interfaces/ISwapRouter.sol'), 'utf8'),
    },
    'interfaces/ICurvePool.sol': {
      content: fs.readFileSync(path.resolve('contracts/src/interfaces/ICurvePool.sol'), 'utf8'),
    },
    'interfaces/IERC7528PriceOracle.sol': {
      content: fs.readFileSync(path.resolve('contracts/src/interfaces/IERC7528PriceOracle.sol'), 'utf8'),
    },
    'HyperonRouter.t.sol': {
      content: fs.readFileSync(path.resolve('contracts/test/HyperonRouter.t.sol'), 'utf8'),
    },
    'HyperonOracleAggregator.t.sol': {
      content: fs.readFileSync(path.resolve('contracts/test/HyperonOracleAggregator.t.sol'), 'utf8'),
    },
    'root_test/HyperonOracleAggregator.t.sol': {
      content: fs.readFileSync(path.resolve('test/HyperonOracleAggregator.t.sol'), 'utf8'),
    },
    'HyperonToken.sol': {
      content: fs.readFileSync(path.resolve('contracts/HyperonToken.sol'), 'utf8'),
    },
  };

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  let hasErrors = false;

  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error('❌ SOLC ERROR:', error.formattedMessage);
        hasErrors = true;
      } else {
        console.warn('⚠️ SOLC WARNING:', error.formattedMessage);
      }
    }
  }

  if (hasErrors) {
    throw new Error('Solidity compilation failed with errors');
  }

  const contracts = output.contracts;
  console.log('✅ Solidity Compilation Succeeded!');
  const routerContract =
    contracts['contracts_src/HyperonRouter.sol']?.['HyperonRouter'] ||
    contracts['src/HyperonRouter.sol']?.['HyperonRouter'] ||
    contracts['HyperonRouter.sol']?.['HyperonRouter'];
  const oracleContract =
    contracts['src/HyperonOracleAggregator.sol']?.['HyperonOracleAggregator'] ||
    contracts['contracts_src/HyperonOracleAggregator.sol']?.['HyperonOracleAggregator'] ||
    contracts['HyperonOracleAggregator.sol']?.['HyperonOracleAggregator'];

  const routerBytecode = routerContract?.evm?.bytecode?.object || '';
  const oracleBytecode = oracleContract?.evm?.bytecode?.object || '';
  console.log(`- HyperonRouter bytecode length: ${routerBytecode.length / 2} bytes`);
  console.log(`- HyperonOracleAggregator bytecode length: ${oracleBytecode.length / 2} bytes`);

  return output;
}

if (process.argv[1] && process.argv[1].endsWith('compileContracts.ts')) {
  try {
    compileSolidityContracts();
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
}
