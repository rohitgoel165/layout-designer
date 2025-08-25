//import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

//dotenv.config();

function dataUrlToBuffer(dataUrl) {
  const m = /^data:(.+);base64,(.*)$/.exec(dataUrl || '');
  if (!m) return null;
  return Buffer.from(m[2], 'base64');
}

export async function sendEmailHandler(req, res) {
  try {
    const { to, subject, text, attachments = [] } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing "to" email' });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // attachments: [{ filename?: string; content: string (dataUrl or base64) }]
    const nodemailerAttachments = (attachments || []).map(a => {
      if (typeof a.content === 'string' && a.content.startsWith('data:')) {
        const buf = dataUrlToBuffer(a.content);
        if (!buf) throw new Error('Invalid data URL in attachment');
        return { filename: a.filename || 'qr.png', content: buf, contentType: 'image/png' };
      }
      // fallback: treat as base64
      return { filename: a.filename || 'attachment.bin', content: a.content, encoding: 'base64' };
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: subject || 'Your QR code',
      text: text || 'Please find your QR code attached.',
      attachments: nodemailerAttachments,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('sendEmail error', err);
    res.status(500).json({ error: err.message });
  }
}
