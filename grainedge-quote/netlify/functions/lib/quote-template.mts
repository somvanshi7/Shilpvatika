// Shilpvatika Quote — Server-side HTML Template Builder
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Builds the complete HTML for a quote. 
 * This HTML is standalone, includes all CSS inline, and is optimized for Puppeteer to print as an A4 PDF.
 */
export function buildQuoteHtml(data) {
  // Load logo as base64 data URL for reliable PDF rendering
  let logoDataUrl = '';
  try {
    const logoPath = join(process.cwd(), 'grainedge-quote', 'public', 'logo-shilpvatika.png');
    const logoBuffer = readFileSync(logoPath);
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (e) {
    // Fallback: try relative path (Netlify functions run from repo root)
    try {
      const logoPath = join(process.cwd(), 'public', 'logo-shilpvatika.png');
      const logoBuffer = readFileSync(logoPath);
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      console.warn('[quote-template] Could not load logo, using text fallback');
      logoDataUrl = '';
    }
  }
  const {
    slug,
    clientName,
    company,
    email,
    phone,
    projectType,
    scopeSummary,
    lineItems,
    subtotal,
    gstAmount,
    total,
    gstRate,
    created_at,
    expires_at,
  } = data;

  const issueDate = new Date(created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const validUntil = new Date(expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const formattedSubtotal = new Intl.NumberFormat('en-IN').format(Math.round(subtotal));
  const formattedGst = new Intl.NumberFormat('en-IN').format(Math.round(gstAmount));
  const formattedTotal = new Intl.NumberFormat('en-IN').format(Math.round(total));
  const formattedGstRate = (gstRate * 100).toFixed(0);

  const itemsHtml = lineItems.map((item, i) => `
    <tr>
      <td style="text-align: center; color: #6e6054;">${i + 1}</td>
      <td style="font-weight: 500;">${item.description}</td>
      <td style="text-align: right;">${item.qty}</td>
      <td style="text-align: right; color: #6e6054;">${item.unit}</td>
      <td style="text-align: right;">₹${new Intl.NumberFormat('en-IN').format(item.rate)}</td>
      <td style="text-align: right; font-weight: 600;">₹${new Intl.NumberFormat('en-IN').format(item.amount)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation - ${slug}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* CSS for PDF Rendering (A4 Size) */
    :root {
      --clr-accent: #7a4e2d;
      --clr-bg: #ffffff;
      --clr-surface: #f9f7f4;
      --clr-text: #1a1410;
      --clr-text-light: #6e6054;
      --clr-border: #e6dfd6;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      color: var(--clr-text);
      background: var(--clr-bg);
      line-height: 1.5;
      font-size: 11pt; /* Print optimized */
    }

    /* Page container setup for A4 */
    @page {
      size: A4 portrait;
      margin: 15mm 12mm;
    }
    
    .quote-container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--clr-accent);
      margin-bottom: 32px;
    }
    
    .brand-col h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28pt;
      color: var(--clr-accent);
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .brand-col p { font-size: 10pt; color: var(--clr-text-light); }
    
    .meta-col { text-align: right; }
    .meta-col .doc-title {
      font-size: 24pt;
      font-weight: 300;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: auto auto;
      gap: 4px 16px;
      text-align: right;
      font-size: 9pt;
    }
    .meta-label { color: var(--clr-text-light); font-weight: 600; }
    .meta-value { font-weight: 500; }

    /* Client Info */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .bill-to h3, .project-details h3 {
      font-size: 10pt;
      color: var(--clr-text-light);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .bill-to .name { font-size: 14pt; font-weight: 700; margin-bottom: 4px; }
    
    .project-details {
      background: var(--clr-surface);
      padding: 16px;
      border-radius: 8px;
      width: 45%;
    }
    .project-details .val { font-weight: 600; margin-bottom: 4px; }

    /* Items Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    th {
      background: var(--clr-accent);
      color: #fff;
      padding: 10px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: right;
    }
    th:nth-child(1), th:nth-child(2) { text-align: left; }
    
    td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--clr-border);
      font-size: 10pt;
      page-break-inside: avoid;
    }
    tr:nth-child(even) { background: #faf9f7; }

    /* Totals */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .totals-table {
      width: 350px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--clr-border);
      font-size: 11pt;
    }
    .totals-table tr:last-child td { border-bottom: none; }
    .totals-table .label { color: var(--clr-text-light); font-weight: 600; }
    .totals-table .amount { text-align: right; font-weight: 500; }
    .totals-table .grand-total {
      background: var(--clr-surface);
    }
    .totals-table .grand-total .label {
      font-size: 12pt;
      color: var(--clr-text);
    }
    .totals-table .grand-total .amount {
      font-size: 14pt;
      font-weight: 700;
      color: var(--clr-accent);
    }

    /* Terms & Footer */
    .terms-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .terms-section h3 {
      font-size: 10pt;
      color: var(--clr-text-light);
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .terms-list {
      font-size: 9pt;
      color: var(--clr-text-light);
      padding-left: 16px;
    }
    .terms-list li { margin-bottom: 4px; }

    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 250px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid var(--clr-text);
      margin-bottom: 8px;
      height: 40px;
    }
    .sig-text { font-size: 10pt; color: var(--clr-text-light); }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid var(--clr-border);
      text-align: center;
      font-size: 8pt;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="quote-container">
    
    <!-- Header -->
    <div class="header">
      <div class="brand-col">
        <img src="${logoDataUrl}" alt="Shilpvatika" style="height: 72px; width: auto; margin-bottom: 8px;" />
        <p>Interior Design & Wood Works</p>
        <p style="margin-top: 8px;">42 Industrial Area, Phase-2, Gurugram, Haryana</p>
        <p>+91 98765 43210 | hello@shilpvatika.com</p>
      </div>
      <div class="meta-col">
        <div class="doc-title">Quotation</div>
        <div class="meta-grid">
          <div class="meta-label">Quote ID</div>
          <div class="meta-value">${slug}</div>
          
          <div class="meta-label">Issue Date</div>
          <div class="meta-value">${issueDate}</div>
          
          <div class="meta-label">Valid Until</div>
          <div class="meta-value">${validUntil}</div>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="info-section">
      <div class="bill-to">
        <h3>Prepared For</h3>
        <div class="name">${clientName}</div>
        ${company ? `<div>${company}</div>` : ''}
        <div>${email}</div>
        <div>${phone}</div>
      </div>
      
      <div class="project-details">
        <h3>Project Details</h3>
        <div class="val">${projectType}</div>
        <div style="font-size: 9.5pt; color: #555; margin-top: 8px;">
          ${scopeSummary.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>

    <!-- Items -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 45%;">Description</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 10%;">Unit</th>
          <th style="width: 15%;">Rate</th>
          <th style="width: 15%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrapper">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal</td>
          <td class="amount">₹${formattedSubtotal}</td>
        </tr>
        <tr>
          <td class="label">GST (${formattedGstRate}%)</td>
          <td class="amount">₹${formattedGst}</td>
        </tr>
        <tr class="grand-total">
          <td class="label">Total Amount</td>
          <td class="amount">₹${formattedTotal}</td>
        </tr>
      </table>
    </div>

    <!-- Terms -->
    <div class="terms-section">
      <h3>Terms & Conditions</h3>
      <ul class="terms-list">
        <li>This quotation is valid until ${validUntil}.</li>
        <li>Prices are inclusive of material, labour, and installation unless specified otherwise.</li>
        <li>A booking advance of 40% is required to confirm the order. Balance 30% before material procurement and 30% on completion.</li>
        <li>Delivery timelines start from the date of design approval and advance payment.</li>
        <li>Warranty: 5 years on manufacturing defects and hardware.</li>
      </ul>
    </div>

    <!-- Signature -->
    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-text">For Shilpvatika</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Generated automatically by Shilpvatika Quotation Portal.
    </div>
    
  </div>
</body>
</html>
  `;
}
