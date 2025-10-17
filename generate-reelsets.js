// Script to generate reelsets for slot game
// Run with: node generate-reelsets.js

const generateReelsets = () => {
    const numReels = 6; // Number of reels
    const reelLength = 100; // Length of each reel
    const numSymbols = 10; // Number of different symbols (0-9)
    
    const reelsets = [];
    
    for (let reel = 0; reel < numReels; reel++) {
        const reelData = [];
        
        // Generate random symbols for this reel
        for (let i = 0; i < reelLength; i++) {
            const symbolId = Math.floor(Math.random() * numSymbols);
            reelData.push(symbolId);
        }
        
        reelsets.push(reelData);
    }
    
    return reelsets;
};

const formatForTypeScript = (reelsets) => {
    let output = 'export const Reelsets = {\n';
    output += '    "Reelsets": [\n';
    
    reelsets.forEach((reel, index) => {
        output += `        [${reel.join(', ')}]`;
        if (index < reelsets.length - 1) {
            output += ',';
        }
        output += '\n';
    });
    
    output += '    ]\n';
    output += '};\n';
    
    return output;
};

// Generate and output the reelsets
const reelsets = generateReelsets();
const formattedOutput = formatForTypeScript(reelsets);

console.log('Generated Reelsets:');
console.log(formattedOutput);

// You can also save to file if needed
// const fs = require('fs');
// fs.writeFileSync('Reelsets.ts', formattedOutput);
