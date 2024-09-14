const express = require('express');
const chromium = require('chrome-aws-lambda');

const app = express();
const port = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const url = 'https://finance.yahoo.com/topic/latest-news/';

  try {
    // Launch Puppeteer with the default configuration from chrome-aws-lambda
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for the content to load
    await page.waitForSelector('li.js-stream-content');

    // Scroll the page
    await page.evaluate(() => {
      window.scrollBy(0, 2000);
    });

    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    // Fetch current date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Extract news data
    const newsItems = await page.evaluate(() => {
      const articles = Array.from(
        document.querySelectorAll('li.js-stream-content')
      );
      return articles
        .map((article) => {
          const titleElement = article.querySelector('h3 a');
          const linkElement = article.querySelector('h3 a');
          const summaryElement = article.querySelector('p');
          const imageElement = article.querySelector('img');
          const sourceElement = article.querySelector('span');

          if (!titleElement || !summaryElement || !imageElement || !sourceElement) {
            return null;
          }

          let imageUrl = imageElement.getAttribute('src');
          if (imageUrl.includes('spaceball.gif')) {
            imageUrl =
              imageElement.getAttribute('data-src') ||
              imageElement.getAttribute('srcset');
          }

          return {
            title: titleElement?.textContent.trim(),
            link: linkElement?.getAttribute('href'),
            description: summaryElement?.textContent.trim(),
            imageUrl,
            source: sourceElement?.textContent.trim(),
          };
        })
        .filter((item) => item !== null);
    });

    const enrichedNewsItems = newsItems.map((item) => ({
      ...item,
      fetchedAt: formattedDate,
    }));

    await browser.close();

    res.json(enrichedNewsItems);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
