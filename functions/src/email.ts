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

// The look of the app: white, a big bold title, gray text, round teal buttons and light gray boxes
const TEAL = '#2f6b7a';
const TEXT = '#1c1c1c';
const MUTED = '#6b6b6b';
const SOFT = '#f1f2f6';
// Mulish is the font of the app. Only some mail apps load it, the others use the fallbacks.
const FONT = "'Mulish','Nunito','Trebuchet MS',Arial,Helvetica,sans-serif";

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type Email = {
  to: string;
  subject: string;
  heading: string;
  // Each one is a paragraph (plain text)
  paragraphs: string[];
  // Lines of a box under the text, like the when and the services of a booking
  details?: { label: string; value: string }[];
  button?: { label: string; url: string };
};

const render = ({ heading, paragraphs, details, button }: Email) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:${FONT};color:${TEXT};">
    <div style="max-width:30rem;margin:0 auto;padding:32px 24px 40px;">
      <p style="margin:0 0 36px;"><img src="${appUrl.value()}/logo-full.png" alt="Find Your Beauty" width="190" style="display:block;border:0;height:auto;max-width:190px;font-size:16px;font-weight:800;color:${TEAL};"></p>
      <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;font-weight:800;color:${TEXT};">${escape(heading)}</h1>
      ${paragraphs
        .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${MUTED};">${escape(p)}</p>`)
        .join('')}
      ${
        details?.length
          ? `<div style="margin:24px 0;padding:18px 20px;background:${SOFT};border-radius:16px;">${details
              .map(
                (d, i) =>
                  `<p style="margin:${i ? '12px' : '0'} 0 0;font-size:13px;color:${MUTED};">${escape(d.label)}</p><p style="margin:2px 0 0;font-size:16px;font-weight:700;color:${TEXT};">${escape(d.value)}</p>`,
              )
              .join('')}</div>`
          : ''
      }
      ${
        button
          ? `<p style="margin:32px 0 0;"><a href="${escape(button.url)}" style="display:block;background:${TEAL};color:#ffffff;text-decoration:none;text-align:center;padding:17px 24px;border-radius:999px;font-size:16px;font-weight:700;">${escape(button.label)}</a></p>`
          : ''
      }
      <p style="margin:40px 0 0;font-size:12px;line-height:1.5;color:#9a9aa3;">Você recebeu este e-mail porque tem uma conta no Find Your Beauty.</p>
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
