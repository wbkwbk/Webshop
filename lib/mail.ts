import nodemailer from "nodemailer";

export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
};

type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function mailText(body: string, publicUrl = process.env.SHOP_PUBLIC_URL) {
  const base = publicUrl?.trim().replace(/\/$/, "") ?? "";
  if (!base) return body;
  return body.replace(/^Link: (\/\S+)/gm, (_, path: string) => `Link: ${base}${path}`);
}

export function mailIsConfigured() {
  return readSmtp() !== null;
}

export function queueShopMail(message: OutgoingMail) {
  const smtp = readSmtp();
  if (!smtp) return;
  void sendSmtp(smtp, message).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`Mail to ${message.to} was not sent: ${reason}`);
  });
}

function readSmtp(): SmtpSettings | null {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASSWORD?.trim() ?? "";
  const from = process.env.MAIL_FROM?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!host || !user || !pass || !from || !Number.isInteger(port)) return null;
  return { host, port, user, pass, from };
}

async function sendSmtp(smtp: SmtpSettings, message: OutgoingMail) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    requireTLS: smtp.port === 587,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transport.sendMail({
    from: smtp.from,
    to: message.to,
    subject: message.subject,
    text: mailText(message.text),
  });
}
