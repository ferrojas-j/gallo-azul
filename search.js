import { readFileSync } from 'fs';
const src = readFileSync('src/App.tsx', 'utf8');
const lines = src.split('\n');
const keywords = ['hotelPayment', 'HotelPayment', 'paymentForm', 'addTransaction', 'PaymentForm', 'payment_modal', 'payment modal'];
keywords.forEach(kw => {
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(kw.toLowerCase())) {
      console.log(`Line ${i+1} [${kw}]: ${line.trim()}`);
    }
  });
});
