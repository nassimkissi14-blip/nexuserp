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
 * Render a QR payload to a base64-encoded PNG data URL.
 * @param {object} payload  — the structured QR data object
 * @returns {Promise<string>} — data:image/png;base64,...
 */
export async function renderQrPng(payload) {
  const json = JSON.stringify(payload);
  return QRCode.toDataURL(json, {
    errorCorrectionLevel: 'M',
    type:                 'image/png',
    width:                256,
    margin:               2,
    color: {
      dark:  '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Full pipeline: build payload → render PNG → return everything.
 */
export async function generateQr({ type, referenceId, name, extraData = {} }) {
  const payload  = buildQrPayload({ type, referenceId, name, extraData });
  const imageB64 = await renderQrPng(payload);
  return { payload, imageB64, uniqueCode: payload.unique_code };
}
