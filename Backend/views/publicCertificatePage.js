const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

// Render complete HTML for visitors and social crawlers without requiring JS.
const publicCertificatePage = ({ title, description, links, image, student, course, institute, code, verified = false, unavailable = false }) => {
  const e = escapeHtml;
  return `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="${e(links.page)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CERTIVERXIA">
  <meta property="og:url" content="${e(links.page)}">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:description" content="${e(description)}">
  ${image ? `<meta property="og:image" content="${e(links.image)}">
  <meta property="og:image:alt" content="${e(`Certificate awarded to ${student}`)}">
  <meta name="twitter:image" content="${e(links.image)}">
  <meta name="twitter:image:alt" content="${e(`Certificate awarded to ${student}`)}">` : ''}
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f3f6fc;color:#142341;font:16px/1.6 system-ui,sans-serif}
    header{padding:20px 5%;background:white;border-bottom:1px solid #dde5f1}header a{font-weight:800;letter-spacing:.08em;color:#1557db;text-decoration:none}
    main{max-width:1120px;margin:32px auto;padding:0 20px}section{background:white;border:1px solid #dde5f1;border-radius:20px;padding:clamp(20px,4vw,40px);box-shadow:0 8px 28px #17345c0a}
    h1{font-size:clamp(24px,4vw,36px);line-height:1.2;margin:12px 0}p{color:#485b76}.status{display:inline-block;border-radius:30px;padding:5px 14px;background:#e8f4ed;color:#195737;font-size:14px;font-weight:600}.warning{background:#fff3d9;color:#755216}
    .certificate{display:block;width:100%;height:auto;margin:24px 0;border:1px solid #dce3ee;border-radius:8px}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}dt{color:#63738c;font-size:13px}dd{margin:3px 0 0;font-weight:600;overflow-wrap:anywhere}
    .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.button{display:inline-block;border-radius:10px;padding:10px 18px;background:#1557db;color:white;text-decoration:none;font-weight:600}.secondary{background:#edf3ff;color:#154ba8}footer{text-align:center;color:#63738c;font-size:13px;padding:24px}a:focus-visible{outline:3px solid #f9b637;outline-offset:4px}
  </style>
</head>
<body>
  <header><a href="/">CERTIVERXIA</a></header>
  <main><section>
    <span class="status${!verified ? ' warning' : ''}">${unavailable ? 'Certificate unavailable' : verified ? 'Digitally verified certificate' : 'Certificate record'}</span>
    <h1>${e(title)}</h1>
    <p>${e(description)}</p>
    ${image ? `<img class="certificate" src="${e(links.image)}" alt="${e(`Certificate awarded to ${student}`)}" fetchpriority="high">` : ''}
    ${!unavailable ? `<dl>${[['Recipient', student], ['Course', course], ['Issued by', institute], ['Certificate code', code]].map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value || 'Not available')}</dd></div>`).join('')}</dl>` : ''}
    ${!unavailable && !verified ? '<p>This is a legacy certificate without a validated digital signature. Check the full verification record for details.</p>' : ''}
    ${!unavailable && !image ? '<p>The certificate image is unavailable. Contact the issuing institute for a copy.</p>' : ''}
    <div class="actions"><a class="button" href="${e(links.verify)}">View verification details</a>${image ? `<a class="button secondary" href="${e(links.image)}" target="_blank" rel="noopener noreferrer">Open full-size certificate</a>` : ''}</div>
  </section></main>
  <footer>Shared through CERTIVERXIA · Certificate status is checked when this page is opened.</footer>
</body></html>`;
};

module.exports = { publicCertificatePage };
