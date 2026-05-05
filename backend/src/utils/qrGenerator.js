/**
 * NexusERP — Universal QR Generator Utility
 * Generates QR code PNGs as base64 strings from structured payloads.
 */
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically unique code.
 * Format: QR-<TYPE>-<RANDOM_HEX>
 */
export function generateUniqueCode(type) {
  const rand = randomBytes(6).toString('hex').toUpperCase();
  return `QR-${type.toUpperCase().slice(0, 4)}-${rand}`;
}

/**
 * Build the structured QR payload for any entity type.
 */
export function buildQrPayload({ type, referenceId, name, extraData = {} }) {
  return {
    type,
    reference_id: referenceId,
    name,
    extra_data:   extraData,
    unique_code:  generateUniqueCode(type),
    created_at:   new Date().toISOString(),
  };
}

/**
 * Render a QR code that encodes a scan URL.
 * baseUrl is passed from the request so it works on any host (local IP, Render, etc.)
 */
export async function renderQrPng(uniqueCode, baseUrl) {
  const url = `${baseUrl}/api/v1/qr/scan/${uniqueCode}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    type:                 'image/png',
    width:                300,
    margin:               2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

/**
 * Full pipeline: build payload → render PNG → return everything.
 */
export async function generateQr({ type, referenceId, name, extraData = {}, baseUrl = 'http://localhost:3001' }) {
  const payload  = buildQrPayload({ type, referenceId, name, extraData });
  const imageB64 = await renderQrPng(payload.unique_code, baseUrl);
  return { payload, imageB64, uniqueCode: payload.unique_code };
}
