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

  // go to vite preview port 4173
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // wait for something to ensure it loaded
  await new Promise(r => setTimeout(r, 2000));
  if (!gotError) console.log("NO ERROR ON LOAD");
  await browser.close();
  process.exit(0);
})();
