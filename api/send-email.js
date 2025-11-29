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

  const mailOptions = {
    from,
    to,
    subject: 'Nueva solicitud de contacto - Mármoles Barreto',
    text: `Nombre: ${name}\nTeléfono: ${phone}\nTipo: ${projectType}\nMensaje: ${message}`,
    html: `
      <h2>Nueva solicitud de contacto</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Tipo de proyecto:</strong> ${escapeHtml(projectType)}</p>
      <p><strong>Mensaje:</strong><br>${escapeHtml(message)}</p>
    `,
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Error enviando email' }));
  }
};
