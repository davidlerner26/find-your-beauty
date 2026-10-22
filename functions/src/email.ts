import { getAuth } from 'firebase-admin/auth';
import { defineSecret, defineString } from 'firebase-functions/params';

// E-mails are sent with Resend. The API key is a secret:
//   firebase functions:secrets:set RESEND_API_KEY
// The sender is in functions/.env (RESEND_FROM="Find Your Beauty <avisos@seudominio.com.br>"). It has to be an
// address of a domain verified in Resend. Without one, the test sender only delivers to the owner of the Resend account.
export const resendKey = defineSecret('RESEND_API_KEY');
const from = defineString('RESEND_FROM', { default: 'Find Your Beauty <onboarding@resend.dev>' });
// Where the links of the e-mails open
export const appUrl = defineString('APP_URL', { default: 'https://findyourbeauty.com.br' });

const TEAL = '#2f6b7a';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type Email = {
  to: string;
  subject: string;
  heading: string;
  // Each one is a paragraph (plain text)
  paragraphs: string[];
  button?: { label: string; url: string };
};

const render = ({ heading, paragraphs, button }: Email) => `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 12px;background:#f1f2f6;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <div style="max-width:32rem;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:${TEAL};padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;">Find Your Beauty</div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:22px;">${escape(heading)}</h1>
        ${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;">${escape(p)}</p>`).join('')}
        ${
          button
            ? `<p style="margin:24px 0 8px;"><a href="${escape(button.url)}" style="background:${TEAL};color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;display:inline-block;">${escape(button.label)}</a></p>`
            : ''
        }
      </div>
      <div style="padding:16px 28px;background:#f8f8fa;color:#777;font-size:12px;">Você recebeu este e-mail porque tem uma conta no Find Your Beauty.</div>
    </div>
  </body>
</html>`;

// Sends an e-mail. A failure is logged and never thrown: an e-mail must not break what triggered it.
export async function sendEmail(email: Email) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: from.value(),
        to: [email.to],
        subject: email.subject,
        html: render(email),
        text: [email.heading, ...email.paragraphs, email.button?.url ?? '']
          .filter(Boolean)
          .join('\n\n'),
      }),
    });
    if (!response.ok) console.error('Resend failed', response.status, await response.text());
  } catch (error) {
    console.error('Resend failed', error);
  }
}

// The e-mail of an account (the professionals and clients don't keep it in a place we can trust)
export async function emailOf(uid: string | null | undefined) {
  if (!uid) return null;
  try {
    return (await getAuth().getUser(uid)).email ?? null;
  } catch (error) {
    console.error('No e-mail for', uid, error);
    return null;
  }
}

// "sábado, 24 de outubro, às 12:00", in Brazil's time
export const when = (date: Date) => {
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${day}, às ${time}`;
};

export const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
