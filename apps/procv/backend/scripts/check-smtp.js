/**
 * SMTP connectivity check: verifies host/port/credentials without sending mail.
 *
 * Usage:
 *   node scripts/check-smtp.js
 *
 * Reads SMTP_* from backend/.env (dotenv) and never prints secrets.
 */
require('dotenv').config();

const nodemailer = require('nodemailer');

async function main() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('ERROR: faltan SMTP_HOST, SMTP_USER o SMTP_PASS en backend/.env');
    console.error('Para SendGrid: SMTP_HOST=smtp.sendgrid.net  SMTP_USER=apikey  SMTP_PASS=<API key SG...>');
    process.exit(1);
  }

  const port = Number(SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  console.log(`Verificando ${SMTP_HOST}:${port} (secure=${SMTP_SECURE === 'true'}) usuario=${SMTP_USER}...`);

  try {
    await transporter.verify();
    console.log('OK: conexion y autenticacion SMTP correctas.');
    console.log(
      `Remitente: ${SMTP_FROM || 'noreply@procv.com'} (debe ser un remitente verificado en el proveedor, si no los envios fallan con 403).`,
    );
  } catch (error) {
    console.error(`FALLO: ${error.message}`);
    console.error('Revisa: credenciales, puerto (587 STARTTLS / 465 TLS / 2525 alternativo),`);
    console.error('que la API key tenga permiso de Mail Send y que la cuenta no este suspendida.');
    process.exit(1);
  }
}

main();
