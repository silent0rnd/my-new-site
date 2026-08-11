const { chromium } = require('playwright');
const dir = 'C:/Users/user/Desktop/my new site/tmp';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file:///' + dir + '/og-card.html');
  await p.waitForTimeout(600);
  console.log(await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [s, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(' '); };
    return ['.eyebrow', '.name', '.role', '.channels', '.stats'].map(r).join('\n');
  }));
  await p.screenshot({ path: 'C:/Users/user/Desktop/my new site/assets/og-cover.jpg', type: 'jpeg', quality: 88 });
  await b.close();
})();
