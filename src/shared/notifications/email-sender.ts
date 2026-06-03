import { Resend } from "resend";
import { env } from "../../config/env.js";
import { TooManyRequestsError } from "../errors/app-error.js";

const resend = new Resend(env.RESEND_API_KEY);

const from = `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM}>`;
const emailSendTimestamps: number[] = [];

//Esse arquivo é responsável por enviar e-mails
//Ela recebe um objeto com os dados do e-mail e envia o e-mail
//O e-mail é enviado usando o Resend

const sendEmail = async (input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fallbackErrorMessage: string;
}): Promise<void> => {
  assertEmailRateLimit();

  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(error.message ?? input.fallbackErrorMessage);
  }

  if (!data?.id) {
    throw new Error(input.fallbackErrorMessage);
  }
};

const assertEmailRateLimit = (): void => {
  const now = Date.now();
  const cutoff = now - env.EMAIL_SEND_RATE_LIMIT_WINDOW_MS;

  while (emailSendTimestamps.length > 0 && emailSendTimestamps[0]! <= cutoff) {
    emailSendTimestamps.shift();
  }

  if (emailSendTimestamps.length >= env.EMAIL_SEND_RATE_LIMIT_MAX) {
    throw new TooManyRequestsError(
      "Limite de envio de e-mail excedido. Tente novamente mais tarde.",
      "EMAIL_SEND_RATE_LIMITED",
    );
  }

  emailSendTimestamps.push(now);
};

export const sendFirstAccessCode = async (input: {
  to: string;
  code: string;
  userName: string;
}): Promise<void> => {
  const ttlMinutes = env.INVITATION_CODE_TTL_MINUTES;
  const subject = `Seu código de primeiro acesso (${ttlMinutes} min)`;
  const text = [
    `Olá, ${input.userName}.`,
    "",
    `Seu código de verificação é: ${input.code}`,
    "",
    `Este código expira em ${ttlMinutes} minutos.`,
    "Se você não solicitou este código, ignore este e-mail.",
  ].join("\n");

  const html = `
    <p>Olá, <strong>${escapeHtml(input.userName)}</strong>.</p>
    <p>Seu código de verificação é:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(input.code)}</p>
    <p>Este código expira em <strong>${ttlMinutes} minutos</strong>.</p>
    <p>Se você não solicitou este código, ignore este e-mail.</p>
  `;

  await sendEmail({
    to: input.to,
    subject,
    html,
    text,
    fallbackErrorMessage: "Falha ao enviar e-mail de primeiro acesso",
  });
};

export const sendMembershipInviteCode = async (input: {
  to: string;
  code: string;
  userName: string;
  enterpriseTradeName: string;
}): Promise<void> => {
  const ttlMinutes = env.INVITATION_CODE_TTL_MINUTES;
  const subject = `Convite para ${input.enterpriseTradeName} — código ${ttlMinutes} min`;
  const text = [
    `Olá, ${input.userName}.`,
    "",
    `A empresa ${input.enterpriseTradeName} convidou você para integrar o time.`,
    `Seu código de aceite é: ${input.code}`,
    "",
    `Este código expira em ${ttlMinutes} minutos.`,
  ].join("\n");

  const html = `
    <p>Olá, <strong>${escapeHtml(input.userName)}</strong>.</p>
    <p>A empresa <strong>${escapeHtml(input.enterpriseTradeName)}</strong> convidou você para integrar o time.</p>
    <p>Seu código de aceite é:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(input.code)}</p>
    <p>Este código expira em <strong>${ttlMinutes} minutos</strong>.</p>
  `;

  await sendEmail({
    to: input.to,
    subject,
    html,
    text,
    fallbackErrorMessage: "Falha ao enviar e-mail de convite",
  });
};

export const sendPasswordResetCode = async (input: {
  to: string;
  code: string;
  userName: string;
}): Promise<void> => {
  const ttlMinutes = env.PASSWORD_RESET_CODE_TTL_MINUTES;
  const subject = `Redefinição de senha (${ttlMinutes} min)`;
  const text = [
    `Olá, ${input.userName}.`,
    "",
    `Seu código para redefinir a senha é: ${input.code}`,
    "",
    `Este código expira em ${ttlMinutes} minutos.`,
    "Se você não solicitou a redefinição de senha, ignore este e-mail.",
  ].join("\n");

  const html = `
    <p>Olá, <strong>${escapeHtml(input.userName)}</strong>.</p>
    <p>Seu código para redefinir a senha é:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(input.code)}</p>
    <p>Este código expira em <strong>${ttlMinutes} minutos</strong>.</p>
    <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
  `;

  await sendEmail({
    to: input.to,
    subject,
    html,
    text,
    fallbackErrorMessage: "Falha ao enviar e-mail de redefinicao de senha",
  });
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
