const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const marker = "  };\r\n\r\n  const handleExpenseSubmit = async (e: React.FormEvent)";
const replacement = `  };\r\n\r\n  const handleCreateDayPass = async () => {\r\n    const adults = Math.max(1, dayPassAdults);\r\n    const children = Math.max(0, dayPassChildren);\r\n    const name = \`\uD83C\uDFD6\uFE0F Day Pass \u00B7 \${adults}Ad \${children}Ni\`;\r\n    const tableId = await createDeliveryOrder(name);\r\n    if (tableId) {\r\n      setSelectedTableId(tableId);\r\n      setCurrentView('mesa');\r\n      setShowDayPassModal(false);\r\n      setDayPassAdults(2);\r\n      setDayPassChildren(0);\r\n    }\r\n  };\r\n\r\n  const handleExpenseSubmit = async (e: React.FormEvent)`;

if (!content.includes('handleCreateDayPass = async') && content.includes(marker)) {
  content = content.replace(marker, replacement);
  fs.writeFileSync('src/App.tsx', content, 'utf-8');
  console.log('SUCCESS: handleCreateDayPass function added');
} else if (content.includes('handleCreateDayPass = async')) {
  console.log('Function already defined');
} else {
  console.log('Marker not found!');
  // Try to find what's between handleCreateDelivery and handleExpenseSubmit
  const idx = content.indexOf('handleExpenseSubmit');
  console.log('Around handleExpenseSubmit:', JSON.stringify(content.slice(idx - 30, idx)));
}
