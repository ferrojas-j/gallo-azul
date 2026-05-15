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

// ESC/POS command bytes
const ESC = 0x1b;
const GS  = 0x1d;

function normalize(s: string): string {
  return s
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/[ñ]/g,'n')
    .replace(/[ÁÀÄÉÈËÍÌÏÓÒÖÚÙÜÑ]/g, c =>
      'AAAEEEIIIOOOUU N'['ÁÀÄÉÈËÍÌÏÓÒÖÚÙÜÑ'.indexOf(c)] ?? c);
}

function bytes(...nums: number[]): number[] { return nums; }
function str(s: string): number[] { return Array.from(new TextEncoder().encode(normalize(s))); }

export function buildEscPos(ticket: {
  isPedido: boolean;
  title: string;
  mesa: string;
  fecha: string;
  items: string;
  total?: string;
}): Uint8Array {
  const c: number[] = [];
  const SEP = '--------------------------------\n';
  const push = (...b: number[]) => c.push(...b);

  // Init + center
  push(...bytes(ESC,0x40, ESC,0x61,0x01));

  // Title bold + double size
  push(...bytes(ESC,0x45,0x01, GS,0x21,0x11));
  push(...str(ticket.title + '\n'));
  push(...bytes(GS,0x21,0x00, ESC,0x45,0x00));

  if (ticket.isPedido) {
    push(...bytes(ESC,0x45,0x01, GS,0x21,0x01));
    push(...str('COCINA / BAR\n'));
    push(...bytes(GS,0x21,0x00, ESC,0x45,0x00));
  }

  push(...str(ticket.mesa + '\n'));
  push(...str(ticket.fecha + '\n'));

  // Items left-aligned
  push(...bytes(ESC,0x61,0x00));
  push(...str(SEP));
  push(...bytes(ESC,0x45,0x01, GS,0x21,0x01));
  // items already newline-separated
  push(...str(ticket.items + '\n'));
  push(...bytes(GS,0x21,0x00, ESC,0x45,0x00));
  push(...str(SEP));

  // Total
  if (ticket.total) {
    push(...bytes(ESC,0x61,0x02, ESC,0x45,0x01, GS,0x21,0x11));
    push(...str('TOTAL: ' + ticket.total + '\n'));
    push(...bytes(GS,0x21,0x00, ESC,0x45,0x00));
  }

  // Feed 4 lines + partial cut
  push(...bytes(ESC,0x64,0x04, GS,0x56,0x01));

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
 * tryRawBt — Send ESC/POS data to the RawBT Android app via URL scheme.
 *
 * RawBT is a free Android app that bridges web apps to Classic Bluetooth
 * thermal printers (SPP). It receives ESC/POS data as a base64 URL and
 * forwards it to the paired printer.
 *
 * Install RawBT: https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter
 *
 * Returns true if the intent was dispatched (RawBT may or may not be installed),
 * false if the environment doesn't support it.
 */
export function tryRawBt(data: Uint8Array): boolean {
  try {
    // Convert Uint8Array to base64
    let binary = '';
    data.forEach(b => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    // RawBT URL scheme — opens RawBT app and sends the ESC/POS payload
    const url = `rawbt:data:application/vnd.rawbt;base64,${base64}`;

    // Use location.href on Android PWA (triggers app intent)
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}

