import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { Resend } from 'resend';
import { fromAddress, resendKey } from './email';

// What arrives at the address of the site (contato@...) is kept by Resend, which calls this function for each e-mail.
// The function reads the e-mail and sends a copy to a personal address. Resend does not forward by itself.
//   firebase functions:secrets:set RESEND_WEBHOOK_SECRET   (the signing secret of the webhook, "whsec_...")
//   firebase functions:secrets:set INBOUND_FORWARD_TO      (the address that gets the copies)
// The webhook (event email.received) is made in the Resend dashboard, pointing to the URL of this function.
const webhookSecret = defineSecret('RESEND_WEBHOOK_SECRET');
const forwardTo = defineSecret('INBOUND_FORWARD_TO');

// --- Pure helpers (tested in functions/tests/inbound.test.ts) ---

export const forwardSubject = (subject: string | null | undefined) => {
  const text = (subject ?? '').trim() || '(sem assunto)';
  return /^(fwd?|enc):/i.test(text) ? text : `Fwd: ${text}`;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// The e-mail as it came, under a line that says who wrote it and to which address
export const forwardBody = (
  mail: { from: string; to: string[]; html: string | null; text: string | null },
  to = mail.to.join(', '),
) => {
  const header = `De: ${mail.from}\nPara: ${to}`;
  return {
    text: `${header}\n\n${mail.text ?? ''}`,
    html: `<p style="color:#666;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:8px">${escapeHtml(
      header,
    ).replace(
      /\n/g,
      '<br>',
    )}</p>${mail.html ?? `<pre style="font-family:inherit">${escapeHtml(mail.text ?? '')}</pre>`}`,
  };
};

// "Ana <ana@x.com>" or "ana@x.com" -> "ana@x.com" (to answer the person, not the site)
export const addressOf = (from: string) => /<([^>]+)>/.exec(from)?.[1] ?? from.trim();

// --- The webhook ---

export const forwardInboundEmail = onRequest(
  {
    region: 'southamerica-east1',
    invoker: 'public',
    secrets: [resendKey, webhookSecret, forwardTo],
  },
  async (request, response) => {
    const headers = {
      id: request.header('svix-id') ?? '',
      timestamp: request.header('svix-timestamp') ?? '',
      signature: request.header('svix-signature') ?? '',
    };
    if (request.method !== 'POST' || !headers.id || !headers.timestamp || !headers.signature) {
      response.status(400).send('Bad request');
      return;
    }

    const resend = new Resend(resendKey.value());
    let event;
    try {
      // The signature is checked on the raw body, exactly as Resend sent it
      event = resend.webhooks.verify({
        payload: request.rawBody.toString('utf8'),
        headers,
        webhookSecret: webhookSecret.value(),
      });
    } catch (error) {
      logger.warn('Webhook with a bad signature', { error });
      response.status(400).send('Invalid signature');
      return;
    }
    if (event.type !== 'email.received') {
      response.status(200).send('Ignored');
      return;
    }

    try {
      const emailId = event.data.email_id;
      const { data: mail, error } = await resend.emails.receiving.get(emailId);
      if (error || !mail) throw new Error(`Could not read the e-mail: ${JSON.stringify(error)}`);

      // The files that came with it, copied as they are
      const attachments: { filename: string; content: string; contentId?: string }[] = [];
      if (mail.attachments?.length) {
        const { data: list, error: listError } = await resend.emails.receiving.attachments.list({
          emailId,
        });
        if (listError || !list) {
          throw new Error(`Could not read the files: ${JSON.stringify(listError)}`);
        }
        for (const file of list.data) {
          const download = await fetch(file.download_url);
          if (!download.ok) throw new Error(`Could not download ${file.filename ?? file.id}`);
          attachments.push({
            filename: file.filename ?? file.id,
            content: Buffer.from(await download.arrayBuffer()).toString('base64'),
            ...(file.content_id ? { contentId: file.content_id } : {}),
          });
        }
      }

      const body = forwardBody(mail);
      const { error: sendError } = await resend.emails.send({
        from: fromAddress(),
        to: [forwardTo.value()],
        // Answering the copy answers the person who wrote
        replyTo: addressOf(mail.from),
        subject: forwardSubject(mail.subject),
        html: body.html,
        text: body.text,
        ...(attachments.length ? { attachments } : {}),
      });
      if (sendError) throw new Error(`Could not send the copy: ${JSON.stringify(sendError)}`);
      response.status(200).send('Forwarded');
    } catch (error) {
      // A failure answers 500: Resend tries again later
      logger.error('Could not forward an e-mail', { error });
      response.status(500).send('Failed');
    }
  },
);
