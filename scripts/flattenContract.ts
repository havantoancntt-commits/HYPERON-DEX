import fs from 'fs';
import path from 'path';

// Collect all required files in order
const importedFiles = new Set<string>();
const collectedLines: string[] = [];

function processFile(filePath: string) {
  if (importedFiles.has(filePath)) return;
  importedFiles.add(filePath);

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const importMatch = line.match(/^import\s+["']([^"']+)["'];/);
    if (importMatch) {
      const imp = importMatch[1];
      let fullPath = '';
      if (imp.startsWith('@openzeppelin/')) {
        fullPath = path.resolve('node_modules', imp);
      } else {
        fullPath = path.resolve(path.dirname(filePath), imp);
      }
      processFile(fullPath);
    } else if (!line.startsWith('// SPDX-License-Identifier:') && !line.startsWith('pragma solidity')) {
      collectedLines.push(line);
    }
  }
}

processFile(path.resolve('contracts/HyperonToken.sol'));

const header = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HyperonToken (HYPR) - Flattened Canonical Source
 * Generated for 1-Click Verification on Etherscan, Arbiscan, Basescan, Polygonscan
 */
`;

const flattenedSource = header + '\n' + collectedLines.join('\n');
fs.writeFileSync('contracts/HyperonToken_Flattened.sol', flattenedSource, 'utf8');

// Append flattened export to artifact
const artifactContent = fs.readFileSync('src/contracts/HyperonTokenArtifact.ts', 'utf8');
const updatedArtifact = artifactContent + `\nexport const HYPERON_TOKEN_FLATTENED_SOURCE = ${JSON.stringify(flattenedSource)};\n`;
fs.writeFileSync('src/contracts/HyperonTokenArtifact.ts', updatedArtifact, 'utf8');

console.log('Flattened contract created successfully!');
