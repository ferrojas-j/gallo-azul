const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The button-specific string to check (only in the header button)
const buttonSpecificMarker = "setShowDayPassModal(true)";

const compraButtonEnd = "          </button>\r\n        </div>\r\n\r\n        <div className=\"salon-legend\">";
const compraWithDayPass = `          </button>\r\n          <button\r\n            onClick={() => setShowDayPassModal(true)}\r\n            style={{\r\n              display: 'flex',\r\n              alignItems: 'center',\r\n              justifyContent: 'center',\r\n              gap: 8,\r\n              background: '#0ea5e9',\r\n              color: 'white',\r\n              border: 'none',\r\n              padding: '10px 20px',\r\n              borderRadius: '8px',\r\n              fontWeight: 700,\r\n              fontSize: '14px',\r\n              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',\r\n              cursor: 'pointer',\r\n              letterSpacing: '0.3px',\r\n              transition: 'background 0.2s ease'\r\n            }}\r\n            onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}\r\n            onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}\r\n          >\r\n            \uD83C\uDFD6\uFE0F Day Pass\r\n          </button>\r\n        </div>\r\n\r\n        <div className="salon-legend">`;

const hasButton = content.includes(buttonSpecificMarker);
const hasMarker = content.includes(compraButtonEnd);
console.log('Button already in salon header:', hasButton);
console.log('Compra end marker found:', hasMarker);

if (!hasButton && hasMarker) {
  content = content.replace(compraButtonEnd, compraWithDayPass);
  fs.writeFileSync('src/App.tsx', content, 'utf-8');
  console.log('SUCCESS: Day Pass button added to salon header');
} else if (!hasMarker) {
  // Show what's around salon-legend
  const idx = content.indexOf('salon-legend');
  console.log('Around salon-legend:', JSON.stringify(content.slice(idx - 300, idx + 50)));
} else {
  console.log('Button already exists, nothing to do');
}
