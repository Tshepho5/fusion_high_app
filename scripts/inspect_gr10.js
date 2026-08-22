const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchUrl('https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/Grade10Exams.aspx');
  fs.writeFileSync('scripts/gr10_page.html', html);
  console.log('Saved gr10_page.html, searching all Links...');
  
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const href = m[1];
    if (href.includes('fileticket') || href.includes('LinkClick') || text.toLowerCase().includes('paper') || text.toLowerCase().includes('memo') || text.toLowerCase().includes('math') || text.toLowerCase().includes('science')) {
      console.log(`[Link] text: "${text}" -> href: "${href}"`);
    }
  }
}

run().catch(console.error);
