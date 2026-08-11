import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  let gotError = false;
  
  page.on('console', async msg => {
      if (msg.type() === 'error') {
          console.log('BROWSER_ERROR:', msg.text());
          gotError = true;
      }
  });

  page.on('pageerror', err => {
      console.log('PAGE_ERROR:', err.toString());
      gotError = true;
  });

  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  try {
      await page.waitForSelector('.group.bg-white', {timeout: 5000});
      await page.evaluate(() => document.querySelector('.group.bg-white').click());
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Clicking + to add page");
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.title === 'Nouvelle page');
          if (btn) btn.click();
          else console.log("Button not found");
      });
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Switching to Analytics");
      await page.evaluate(() => {
          const navs = Array.from(document.querySelectorAll('nav button'));
          if (navs[6]) navs[6].click();
      });
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Clicking + to add chart");
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.title === 'Nouvelle analyse');
          if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
      
  } catch(e) {
      console.log("TEST_SCRIPT_ERROR:", e.message);
  }

  if (!gotError) console.log("NO_CRASH_DETECTED_DURING_ACTIONS");
  await browser.close();
  process.exit(0);
})();
