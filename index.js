const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const url = 'https://finance.yahoo.com/topic/latest-news/';

  try {
    // Fetch the HTML from the Yahoo Finance page
    const { data } = await axios.get(url);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Get the current date for fetchedAt field
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Extract news articles using Cheerio
    const newsItems = [];
    $('li.js-stream-content').each((i, element) => {
      const titleElement = $(element).find('h3 a');
      const linkElement = $(element).find('h3 a');
      const summaryElement = $(element).find('p');
      const imageElement = $(element).find('img');
      const sourceElement = $(element).find('span');

      // Skip if essential elements are missing
      if (!titleElement || !summaryElement || !imageElement || !sourceElement) {
        return;
      }

      // Extract the image URL safely
      let imageUrl = imageElement.attr('src');

      // Only check if the image URL exists before using `.includes()`
      if (imageUrl && imageUrl.includes('spaceball.gif')) {
        imageUrl = imageElement.attr('data-src') || imageElement.attr('srcset');
      }

      // If no valid image URL, skip this article
      if (!imageUrl) {
        return;
      }

      // Add the article to the newsItems array
      newsItems.push({
        title: titleElement.text().trim(),
        link: linkElement.attr('href'),
        description: summaryElement.text().trim(),
        imageUrl,
        source: sourceElement.text().trim(),
        fetchedAt: formattedDate, // Add fetchedAt field
      });
    });

    // Return the scraped news items as a JSON response
    res.json(newsItems);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
