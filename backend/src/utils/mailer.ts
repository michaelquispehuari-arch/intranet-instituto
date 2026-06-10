import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import { getConfiguredValue } from "./service-config.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

export function assertSmtpConfig() {
  if (!getSmtpConfig()) {
    throw new HttpError(503, "Servicio de email no configurado");
  }
}

function getSmtpConfig() {
  const host = getConfiguredValue(env.SMTP_HOST);
  const user = getConfiguredValue(env.SMTP_USER);
  const pass = getConfiguredValue(env.SMTP_PASS);

  if (!host || !user || !pass) {
    return null;
  }

  return { host, user, pass };
}

function getTransporter() {
  assertSmtpConfig();
  const config = getSmtpConfig();

  if (!config) {
    throw new HttpError(503, "Servicio de email no configurado");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return transporter;
}

export async function sendEmail(message: EmailMessage) {
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    ...message,
  });
}
