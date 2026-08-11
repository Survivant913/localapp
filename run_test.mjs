import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  let gotError = false;
  
  page.on('console', async msg => {
      if (msg.type() === 'error') {
          console.log('BROWSER_ERROR:', msg.text());
          try {
              const args = msg.args();
              for(let i=0; i<args.length; i++) {
                 console.log(await args[i].jsonValue());
              }
          } catch(e) {}
          gotError = true;
      } else {
          // console.log('LOG:', msg.text());
      }
  });

  page.on('pageerror', err => {
      console.log('PAGE_ERROR:', err.toString());
      gotError = true;
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  try {
      // Mock requires a venture, Workspace renders ventures list first
      // wait, Workspace needs to render ventures. 
      // I mocked supabase.from('ventures').select() to return []
      // Let's create a venture
      await page.waitForSelector('input[placeholder="Nouveau projet..."]');
      await page.type('input[placeholder="Nouveau projet..."]', 'Test Venture');
      const createBtns = await page.$$('button');
      // click the one next to the input (it has Plus icon)
      // I'll just evaluate a click on the button that has 'Plus' 
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          btns.find(b => b.innerHTML.includes('lucide-plus')).click();
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      // click the venture card
      await page.evaluate(() => {
          document.querySelector('.group.bg-white').click();
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      // We are in EditorModule. Click "+" to create a page
      console.log("Clicking + to add page");
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          btns.find(b => b.title === 'Nouvelle page').click();
      });
      
      await new Promise(r => setTimeout(r, 1000));
      if (!gotError) console.log("NO_ERROR_ON_ADD_PAGE");
      
      // now let's switch to Analytics and click +
      console.log("Switching to Analytics");
      await page.evaluate(() => {
          const navs = Array.from(document.querySelectorAll('nav button'));
          // Analytics is the 7th module
          navs[6].click();
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      console.log("Clicking + to add chart");
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          btns.find(b => b.title === 'Nouvelle analyse').click();
      });
      
      await new Promise(r => setTimeout(r, 1000));
      if (!gotError) console.log("NO_ERROR_ON_ADD_CHART");

  } catch(e) {
      console.log("TEST_SCRIPT_ERROR:", e);
  }

  await browser.close();
  process.exit(0);
})();
