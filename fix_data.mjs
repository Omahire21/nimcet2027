import fs from 'fs';

let content = fs.readFileSync('src/data.ts', 'utf8');

// Specifically target the corrupted blocks that were not consumed
content = content.replace(/\n\s*\{\n\s*id: "PL2-aspire"[\s\S]*?\n\s*\]\n\s*\},/g, "");
content = content.replace(/\n\s*\{\n\s*id: "PL2-acme"[\s\S]*?\n\s*\]\n\s*\}\n\];/g, "\n];");

fs.writeFileSync('src/data.ts', content);
console.log("Fixed syntax");
