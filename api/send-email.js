const nodemailer = require('nodemailer');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const body = await parseBody(req);
  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const projectType = body.projectType || '';
  const message = (body.message || '').trim();

  if (!name || !phone || !projectType || !message) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Campos requeridos faltantes' }));
    return;
  }

  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Configuración SMTP incompleta' }));
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });

  const to = process.env.MAIL_TO || process.env.SMTP_USER;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@marmolesbarreto.local';

  const phoneDigits = String(phone || '').replace(/[^+\d]/g, '');
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(now);
  function renderEmailTemplate() {
    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeProject = escapeHtml(projectType);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    return (
      '<div style="background-color:#f4f4f4;padding:24px;">' +
      '<table role="presentation" align="center" width="600" style="max-width:600px;width:100%;border-collapse:collapse;">' +
      '<tr><td style="background-color:#1a1a1a;color:#ffffff;padding:24px;text-align:center;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
      '<div style="font-size:20px;font-weight:700;letter-spacing:1px;">MÁRMOLES <span style="color:#c5a059;">BARRETO</span></div>' +
      '<div style="font-size:12px;opacity:0.8;margin-top:6px;">Maestros de la Piedra Natural</div>' +
      '</td></tr>' +
      '<tr><td style="background-color:#ffffff;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
      '<h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;">Nueva solicitud de contacto</h2>' +
      '<table role="presentation" width="100%" style="border-collapse:collapse;">' +
      '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:160px;">Nombre</td><td style="padding:8px 0;color:#111827;font-size:14px;">' + safeName + '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:160px;">Teléfono</td><td style="padding:8px 0;color:#111827;font-size:14px;"><a href="tel:' + phoneDigits + '" style="color:#c5a059;text-decoration:none;">' + safePhone + '</a></td></tr>' +
      '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:160px;">Tipo de proyecto</td><td style="padding:8px 0;color:#111827;font-size:14px;">' + safeProject + '</td></tr>' +
      '</table>' +
      '<div style="margin-top:16px;padding:12px;background:#fafafa;border-left:4px solid #c5a059;color:#374151;line-height:1.6;font-size:14px;">' + safeMessage + '</div>' +
      '<div style="margin-top:16px;color:#6b7280;font-size:12px;">Fecha: ' + formattedDate + '</div>' +
      '</td></tr>' +
      '<tr><td style="background-color:#ffffff;padding:0 24px 24px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px 0;" />' +
      '<div style="color:#6b7280;font-size:12px;">Este correo fue generado automáticamente desde el formulario de contacto.</div>' +
      '</td></tr>' +
      '<tr><td style="background-color:#1a1a1a;color:#9ca3af;padding:16px;text-align:center;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;">&copy; 2024 Mármoles Barreto</td></tr>' +
      '</table>' +
      '</div>'
    );
  }

  const mailOptions = {
    from,
    to,
    subject: 'Nueva solicitud de contacto - Mármoles Barreto',
    text: `Nombre: ${name}\nTeléfono: ${phone}\nTipo: ${projectType}\nMensaje: ${message}`,
    html: renderEmailTemplate(),
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('Email send error:', err && err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Error enviando email' }));
  }
};
