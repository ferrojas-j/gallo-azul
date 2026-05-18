// ESC/POS Bluetooth Printer — Web Bluetooth BLE + RawBT (Classic BT) implementation
// Compatible with POS-5890A-M and similar thermal printers on Android PWA
//
// Print chain:
//   1. Web Bluetooth BLE   → direct BLE GATT (if printer supports BLE)
//   2. RawBT app           → rawbt:// URL scheme (Classic BT / any Android BT printer)
//   3. Browser popup       → standard HTML print dialog (desktop / fallback)

// Web Bluetooth API type shims (not included in default TS lib)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare class BluetoothDevice { gatt?: any; }
declare class BluetoothRemoteGATTCharacteristic { properties: { writeWithoutResponse: boolean }; writeValueWithoutResponse(v: BufferSource): Promise<void>; writeValue(v: BufferSource): Promise<void>; }


// Known BLE service/characteristic UUIDs for thermal printers
const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Nordic UART / generic serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter / pos-5890 BLE
];
const CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

// ESC/POS command constants
const ESC = 0x1b;
const GS  = 0x1d;

/**
 * toAscii — Convert any Unicode string to strict 7-bit ASCII.
 *
 * Uses NFD decomposition to strip combining diacritical marks (accents, tildes)
 * universally, then replaces any remaining non-ASCII (emojis, em-dashes, etc.)
 * with a safe placeholder.
 *
 * WHY: Thermal printers use single-byte code pages (ASCII / CP437 / Latin-1).
 * They CANNOT interpret UTF-8 multi-byte sequences — those bytes print as
 * random garbage characters. This function ensures every byte we send is ≤ 0x7F.
 */
function toAscii(s: string): string {
  return s
    .normalize('NFD')                // é → e + U+0301 (combining acute accent)
    .replace(/[\u0300-\u036f]/g, '') // strip all combining diacritical marks
    .replace(/[^\x00-\x7F]/g, '?'); // replace any remaining non-ASCII with '?'
}

/**
 * pushStr — Push each character as a single ASCII byte into the buffer.
 * Never uses TextEncoder (which produces UTF-8 multi-byte sequences).
 */
function pushStr(c: number[], s: string): void {
  const safe = toAscii(s);
  for (let i = 0; i < safe.length; i++) {
    c.push(safe.charCodeAt(i) & 0x7f);
  }
}

export function buildEscPos(ticket: {
  isPedido: boolean;
  title: string;
  mesa: string;
  fecha: string;
  items: string;
  total?: string;
}): Uint8Array {
  const c: number[] = [];
  const B = (...b: number[]) => c.push(...b);
  const S = (s: string) => { const a = toAscii(s); for (let i = 0; i < a.length; i++) c.push(a.charCodeAt(i) & 0x7f); };
  const NL = () => c.push(0x0a);
  const SEP = () => { S('================================'); NL(); };

  // ESC @ — REQUIRED by RAW BT to recognize data as a valid print job
  // Without this, RAW BT returns "Empty print job" even with valid text.
  B(0x1b, 0x40);

  // Plain text content — no double-size or alignment commands
  // (those caused garbled output on previous attempts)
  NL();
  S(ticket.title.toUpperCase()); NL();
  if (ticket.isPedido) { S('** COCINA / BAR **'); NL(); }
  S(ticket.mesa); NL();
  S(ticket.fecha); NL();
  SEP();

  ticket.items.split('\n').forEach(line => {
    if (line.trim()) { S(line); NL(); }
  });

  SEP();

  if (ticket.total) {
    NL();
    S('TOTAL:  ' + ticket.total); NL();
  }

  // Feed lines so paper advances past the cut line
  B(0x0a, 0x0a, 0x0a, 0x0a);

  return new Uint8Array(c);
}


// Singleton connection state
let _device: BluetoothDevice | null = null;
let _char: BluetoothRemoteGATTCharacteristic | null = null;
let _onStatusChange: ((connected: boolean) => void) | null = null;

export const bluetoothPrinter = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },
  isConnected(): boolean {
    return !!(_device?.gatt?.connected && _char);
  },
  onStatusChange(cb: (connected: boolean) => void) {
    _onStatusChange = cb;
  },

  async connect(): Promise<void> {
    if (!this.isSupported()) throw new Error('Web Bluetooth no disponible. Usa Chrome en Android.');

    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });

    const server = await device.gatt!.connect();

    let found: BluetoothRemoteGATTCharacteristic | null = null;

    // Try known UUIDs first
    for (const svcId of SERVICE_UUIDS) {
      if (found) break;
      try {
        const svc = await server.getPrimaryService(svcId);
        for (const charId of CHAR_UUIDS) {
          try {
            const ch = await svc.getCharacteristic(charId);
            if (ch.properties.write || ch.properties.writeWithoutResponse) {
              found = ch; break;
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    // Enumerate all if not found yet
    if (!found) {
      const services = await server.getPrimaryServices();
      for (const svc of services) {
        if (found) break;
        const chars = await svc.getCharacteristics();
        for (const ch of chars) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            found = ch; break;
          }
        }
      }
    }

    if (!found) throw new Error('No se encontró característica de escritura. Verifica que la impresora sea BLE/GATT.');

    _device = device;
    _char = found;
    _onStatusChange?.(true);

    device.addEventListener('gattserverdisconnected', () => {
      _device = null; _char = null;
      _onStatusChange?.(false);
    });
  },

  disconnect(): void {
    _device?.gatt?.disconnect();
    _device = null; _char = null;
    _onStatusChange?.(false);
  },

  async print(data: Uint8Array): Promise<void> {
    if (!_char) throw new Error('Impresora no conectada.');
    const CHUNK = 200; // Safe BLE chunk size
    const useNoResponse = _char.properties.writeWithoutResponse;
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      if (useNoResponse) await _char.writeValueWithoutResponse(chunk);
      else await (_char as any).writeValue(chunk);
      await new Promise(r => setTimeout(r, 30));
    }
  },
};

/**
 * tryRawBt — Send ESC/POS data to the RawBT Android app.
 *
 * Strategy 1 (primary): invisible <a> click with rawbt:// scheme.
 *   - More reliable than window.location.href in Chrome Android standalone PWA mode.
 *   - Chrome blocks location.href deep-link navigation from PWA standalone context
 *     but allows anchor clicks triggered by user-gesture chains.
 *
 * Strategy 2 (fallback): window.open() which sometimes succeeds when anchor does not.
 *
 * RawBT URL format: rawbt://base64/<base64-encoded-ESC/POS>
 *
 * Returns true if the dispatch was attempted, false on encoding error.
 */
export function tryRawBt(data: Uint8Array): boolean {
  try {
    if (!data || data.length === 0) {
      console.error('[RawBT] tryRawBt called with empty data!');
      return false;
    }

    // Encode ESC/POS bytes to base64
    let binary = '';
    data.forEach(b => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    console.log(`[RawBT] data.length=${data.length} base64.length=${base64.length} first10="${base64.substring(0,10)}"`);

    // Try multiple URL formats in sequence.
    // We know anchor click reaches RAW BT (confirmed via printed output).
    // Format priority: simplest first, then MIME data URI.
    const urls = [
      `rawbt:${base64}`,                                          // Simplest: scheme + raw base64
      `rawbt:data:application/vnd.rawbt;base64,${base64}`,       // MIME data URI (RAW BT recognized this format)
    ];

    for (const url of urls) {
      // Anchor click: confirmed to reach RAW BT on Android PWA
      try {
        const a = document.createElement('a');
        a.setAttribute('href', url); // setAttribute avoids Chrome's URL normalization on a.href
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 1000);
        console.log(`[RawBT] dispatched via anchor: ${url.substring(0, 50)}...`);
        return true;
      } catch (e) {
        console.warn('[RawBT] anchor click failed:', e);
      }
    }

    return false;
  } catch (e) {
    console.error('[RawBT] error:', e);
    return false;
  }
}
