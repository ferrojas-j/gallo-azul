const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Check the exact content after handleCreateDelivery closing brace
const idx = content.indexOf('const handleCreateDelivery = async');
const section = content.slice(idx, idx + 400);
console.log('Section after handleCreateDelivery:', JSON.stringify(section));
