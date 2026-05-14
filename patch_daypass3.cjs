const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const changes = [];

// Fix 5a: Add gap to the flex div
const oldFlexDiv = "        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>";
const newFlexDiv = "        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: 24 }}>";
if (content.includes(oldFlexDiv)) {
  content = content.replace(oldFlexDiv, newFlexDiv);
  changes.push('5a. Fixed gap in flex div');
} else {
  // Already has gap or different format - find and show what's there
  const idx = content.indexOf("justifyContent: 'flex-start'");
  const sample = content.slice(Math.max(0, idx - 30), idx + 100);
  changes.push('5a. SKIPPED - found: ' + JSON.stringify(sample));
}

// Fix 5b: Add Day Pass button (CRLF line endings)
const compraButtonEnd = "          </button>\r\n        </div>\r\n\r\n        <div className=\"salon-legend\">";
const compraWithDayPass = `          </button>\r\n          <button\r\n            onClick={() => setShowDayPassModal(true)}\r\n            style={{\r\n              display: 'flex',\r\n              alignItems: 'center',\r\n              justifyContent: 'center',\r\n              gap: 8,\r\n              background: '#0ea5e9',\r\n              color: 'white',\r\n              border: 'none',\r\n              padding: '10px 20px',\r\n              borderRadius: '8px',\r\n              fontWeight: 700,\r\n              fontSize: '14px',\r\n              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',\r\n              cursor: 'pointer',\r\n              letterSpacing: '0.3px',\r\n              transition: 'background 0.2s ease'\r\n            }}\r\n            onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}\r\n            onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}\r\n          >\r\n            \uD83C\uDFD6\uFE0F Day Pass\r\n          </button>\r\n        </div>\r\n\r\n        <div className="salon-legend">`;

if (!content.includes('\uD83C\uDFD6\uFE0F Day Pass') && content.includes(compraButtonEnd)) {
  content = content.replace(compraButtonEnd, compraWithDayPass);
  changes.push('5b. Added Day Pass button');
} else {
  const hasButton = content.includes('\uD83C\uDFD6\uFE0F Day Pass');
  const hasMarker = content.includes(compraButtonEnd);
  changes.push(`5b. SKIPPED - button already:${hasButton}, marker:${hasMarker}`);
  if (!hasMarker) {
    // Show what's actually there
    const idx = content.indexOf('salon-legend');
    changes.push('Context: ' + JSON.stringify(content.slice(idx - 200, idx + 20)));
  }
}

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Done. Changes: ' + changes.length);
changes.forEach(c => console.log(' -', c));
