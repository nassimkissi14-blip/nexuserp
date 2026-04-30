import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Ethereal test account fallback — emails visible at https://ethereal.email
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: process.env.SMTP_USER || 'test@ethereal.email', pass: process.env.SMTP_PASS || 'test' },
    });
  }
  return nodemailer.createTransport({
    host, port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const fmtDZD = (n) => Number(n || 0).toLocaleString('fr-DZ') + ' DZD';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export async function sendInvoiceEmail({ to, invoice, company }) {
  const items = invoice.items || [];
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${it.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${it.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmtDZD(it.unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${fmtDZD(it.totalPrice)}</td>
    </tr>`).join('');

  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px">
    <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;color:white">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">🧾 Facture ${invoice.reference}</div>
        <div style="margin-top:6px;opacity:0.85;font-size:14px">${company?.name || 'NexusERP'}</div>
      </div>
      <div style="padding:28px 32px">
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap">
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Client</div>
            <div style="font-weight:600;font-size:15px">${invoice.customer?.name || '—'}</div></div>
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Date émission</div>
            <div style="font-weight:600">${fmtDate(invoice.issueDate)}</div></div>
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Échéance</div>
            <div style="font-weight:600;color:#ef4444">${fmtDate(invoice.dueDate)}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Qté</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Prix unitaire</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:right">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">Sous-total : <strong>${fmtDZD(invoice.subtotal)}</strong></div>
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">TVA (${invoice.taxRate}%) : <strong>${fmtDZD(invoice.taxAmount)}</strong></div>
          <div style="font-size:20px;font-weight:800;color:#6366f1">Total : ${fmtDZD(invoice.totalAmount)}</div>
        </div>
        ${invoice.notes ? `<div style="margin-top:16px;padding:14px;background:#fef9ee;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;font-size:13px;color:#92400e">${invoice.notes}</div>` : ''}
      </div>
      <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
        Document généré par NexusERP • Ce message est automatique
      </div>
    </div>
  </body></html>`;

  const info = await getTransporter().sendMail({
    from: `"${company?.name || 'NexusERP'}" <${process.env.SMTP_USER || 'noreply@nexuserp.dz'}>`,
    to,
    subject: `Facture ${invoice.reference} — ${fmtDZD(invoice.totalAmount)}`,
    html,
  });

  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}

export async function sendQuoteEmail({ to, quote, company }) {
  const items = quote.items || [];
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${it.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${it.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmtDZD(it.unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${fmtDZD(it.totalPrice)}</td>
    </tr>`).join('');

  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px">
    <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#8b5cf6,#a855f7);padding:28px 32px;color:white">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">📄 Devis ${quote.reference}</div>
        <div style="margin-top:6px;opacity:0.85;font-size:14px">${company?.name || 'NexusERP'}</div>
      </div>
      <div style="padding:28px 32px">
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap">
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px">Client</div>
            <div style="font-weight:600;font-size:15px">${quote.customer?.name || '—'}</div></div>
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px">Date</div>
            <div style="font-weight:600">${fmtDate(quote.issueDate || quote.createdAt)}</div></div>
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px">Validité</div>
            <div style="font-weight:600">${fmtDate(quote.validUntil)}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Qté</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Prix unitaire</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:right">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">Sous-total : <strong>${fmtDZD(quote.subtotal)}</strong></div>
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">TVA (${quote.taxRate || 19}%) : <strong>${fmtDZD(quote.taxAmount)}</strong></div>
          <div style="font-size:20px;font-weight:800;color:#8b5cf6">Total : ${fmtDZD(quote.totalAmount)}</div>
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
        Document généré par NexusERP • Ce message est automatique
      </div>
    </div>
  </body></html>`;

  const info = await getTransporter().sendMail({
    from: `"${company?.name || 'NexusERP'}" <${process.env.SMTP_USER || 'noreply@nexuserp.dz'}>`,
    to,
    subject: `Devis ${quote.reference} — ${fmtDZD(quote.totalAmount)}`,
    html,
  });

  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}
