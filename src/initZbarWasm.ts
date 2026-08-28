/**
 * CSP-safe same-origin ZBar WASM for barcode / QR camera decode.
 * Must load before any useBarcodeScanner / QR scan session.
 */
import { setZbarWasmUrl } from 'pi-kiosk-shared/barcode-scanner';
import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url';

setZbarWasmUrl(wasmUrl);
