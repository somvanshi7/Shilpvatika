// Shilpvatika Quote — Email (SendGrid)

/**
 * Sends an email using SendGrid. Falls back to console.log if API key is not set.
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS || 'quotes@shilpvatika.com';

  if (!apiKey) {
    console.log('[EMAIL-MOCK] Would send email:');
    console.log(`  To: ${to}`);
    console.log(`  From: ${from}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Attachments: ${attachments.length}`);
    return { success: true, mock: true };
  }

  const msg = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: 'Shilpvatika' },
    subject,
    content: [{ type: 'text/html', value: html }],
  };

  if (attachments.length > 0) {
    msg.attachments = attachments.map((a) => ({
      content: a.content, // base64 string
      filename: a.filename,
      type: a.type || 'application/pdf',
      disposition: 'attachment',
    }));
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(msg),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[EMAIL-ERROR]', res.status, text);
    throw new Error(`SendGrid error: ${res.status}`);
  }

  return { success: true };
}

/**
 * Send quote email to client with PDF attached.
 */
export async function sendClientEmail({ to, clientName, slug, validityDate, quoteUrl, pdfBase64 }) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1410;">
      <div style="background: #7a4e2d; padding: 24px 32px; text-align: center;">
        <h1 style="color: #fff; font-size: 20px; margin: 0; font-family: Georgia, serif;">Shilpvatika</h1>
        <p style="color: rgba(255,255,255,.7); font-size: 12px; margin: 4px 0 0;">Interior Design & Wood Works</p>
      </div>
      <div style="padding: 32px; background: #ffffff; border: 1px solid #d9cfc2; border-top: none;">
        <p style="font-size: 15px;">Hi ${clientName},</p>
        <p style="font-size: 15px; color: #4a3f36;">Thank you for requesting a quotation from Shilpvatika. Please find your quotation attached as a PDF or view it online.</p>
        <div style="background: #f3efe9; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6e6054;">Quote ID</p>
          <p style="margin: 0; font-weight: 700; font-size: 15px;">${slug}</p>
          <p style="margin: 12px 0 4px; font-size: 13px; color: #6e6054;">Valid Until</p>
          <p style="margin: 0; font-weight: 600; font-size: 15px;">${validityDate}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${quoteUrl}" style="display: inline-block; background: #7a4e2d; color: #fff; padding: 12px 32px; border-radius: 50px; font-weight: 600; font-size: 14px; text-decoration: none;">View Quotation Online</a>
        </div>
        <p style="font-size: 14px; color: #4a3f36;">If you have questions or want to accept the quote, reply to this email or call <strong>+91 98765 43210</strong>.</p>
        <p style="font-size: 14px; color: #4a3f36;">Best regards,<br><strong>Shilpvatika Team</strong></p>
      </div>
      <div style="text-align: center; padding: 16px; font-size: 12px; color: #6e6054;">
        © 2000–2026 Shilpvatika. All rights reserved.
      </div>
    </div>
  `;

  const attachments = pdfBase64
    ? [{ content: pdfBase64, filename: `${slug}.pdf`, type: 'application/pdf' }]
    : [];

  return sendEmail({
    to,
    subject: `Your Shilpvatika Quotation ${slug}`,
    html,
    attachments,
  });
}

/**
 * Send internal notification to sales team.
 */
export async function sendSalesNotification({ slug, clientName, company, email, phone, projectType, total }) {
  const salesEmail = process.env.SALES_NOTIFY_EMAIL || 'sales@shilpvatika.com';
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8888';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1a1410;">
      <h2 style="color: #7a4e2d;">New Quote Created: ${slug}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666; width: 120px;">Client</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${clientName}</td></tr>
        ${company ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Company</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${company}</td></tr>` : ''}
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Project</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${projectType}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Total</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 700; font-size: 16px;">₹${total?.toLocaleString('en-IN') || '—'}</td></tr>
      </table>
      <a href="${baseUrl}/q/${slug}" style="display: inline-block; background: #7a4e2d; color: #fff; padding: 10px 24px; border-radius: 50px; font-weight: 600; font-size: 13px; text-decoration: none;">View Quote</a>
    </div>
  `;

  return sendEmail({
    to: salesEmail,
    subject: `[New Quote] ${slug} — ${clientName} — ${projectType}`,
    html,
  });
}
