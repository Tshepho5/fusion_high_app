const fs = require('fs');

const html = fs.readFileSync('scripts/gr10_page.html', 'utf8');

function parseDnnModules(pageHtml, defaultGrade = 10) {
  const items = [];
  const moduleBlocks = pageHtml.split(/class="DnnModule /i);
  
  for (const block of moduleBlocks) {
    const titleMatch = block.match(/<span id="[^"]*dnnTITLE_titleLabel"[^>]*>([^<]+)<\/span>/i);
    if (!titleMatch) continue;
    
    const moduleTitle = titleMatch[1].trim();
    
    // Find all table rows
    const trRegex = /<tr[\s\S]*?<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(block)) !== null) {
      const rowHtml = trMatch[0];
      const titleM = rowHtml.match(/<td class="TitleCell"><a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a><\/td>/i);
      const dlM = rowHtml.match(/<td class="DownloadCell"><a[^>]*href="([^"]*)"/i);
      
      if (titleM && dlM) {
        const docTitle = titleM[2].replace(/&amp;/g, '&').trim();
        let dlHref = dlM[1].replace(/&amp;/g, '&');
        if (!dlHref.includes('forcedownload=true')) {
          dlHref += (dlHref.includes('?') ? '&' : '?') + 'forcedownload=true';
        }
        
        items.push({
          moduleTitle,
          docTitle,
          dlHref
        });
      }
    }
  }
  return items;
}

const parsed = parseDnnModules(html, 10);
console.log(`Parsed ${parsed.length} items from Grade 10 page:`);
const grouped = {};
parsed.forEach(p => {
  grouped[p.moduleTitle] = (grouped[p.moduleTitle] || 0) + 1;
});
console.log(grouped);
