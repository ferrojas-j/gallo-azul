import { readFileSync, writeFileSync } from 'fs';
const content = readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

// Fix line 2114 (0-indexed: 2113): change `                            )}\r` to `                              );\r\n                            })()}\r`
// The IIFE opened at line 2004 needs: ); })()  to close
const oldLine = lines[2113]; // "                            )}\r"
console.log('Old line 2114:', JSON.stringify(oldLine));

// Replace the closing of the IIFE block
lines[2113] = '                              );\r\n                            })()}\r';
console.log('New line 2114:', JSON.stringify(lines[2113]));

writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('Done! File saved.');
