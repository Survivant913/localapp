import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      console.log('BROWSER_LOG:', msg.text());
  });

  page.on('pageerror', err => {
      console.log('PAGE_ERROR:', err.toString());
  });

  await page.goto('http://localhost:5173/test_click.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
      const ventures = Array.from(document.querySelectorAll('.group.bg-white'));
      if(ventures.length > 0) {
          console.log("Clicking venture");
          ventures[0].click();
      }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Switching to Analytics");
  await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav button'));
      const analyticsBtn = navs.find(n => n.textContent && n.textContent.includes('Analytique'));
      if (analyticsBtn) analyticsBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => { 
        const btns = Array.from(document.querySelectorAll('button'));
        const newChartBtn = btns.find(b => b.title === 'Nouvelle analyse');
        if (newChartBtn) {
            console.log("Clicking Nouvelle analyse");
            newChartBtn.click();
        } else {
            console.log("Chart button not found");
        }
  });
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
  process.exit(0);
})();
