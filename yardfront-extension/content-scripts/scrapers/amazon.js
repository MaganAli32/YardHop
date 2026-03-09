/**
 * Amazon detail and search scrapers.
 */

function scrapeAmazonDetail() {
  const titleEl = document.querySelector('#productTitle');
  const priceEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice');
  const imgEl = document.querySelector('#landingImage');
  const title = titleEl?.textContent?.trim() || '';
  const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
  return {
    title,
    askingPrice: priceText ? parseFloat(priceText) : null,
    imageUrl: imgEl?.src || null,
    platform: 'amazon',
    pageType: 'detail',
  };
}

function scrapeAmazonSearch() {
  console.log('YF: scrapeAmazonSearch running');

  // Amazon search results use data-component-type="s-search-result"
  const listings = document.querySelectorAll('[data-component-type="s-search-result"]');

  console.log('YF: found', listings.length, 'Amazon listings');

  return Array.from(listings)
    .map((el) => {
      // Title
      const titleEl = el.querySelector('h2 a span, .a-text-normal');
      const title = titleEl?.textContent?.trim() || '';
      if (!title) return null;

      // Price — Amazon has whole and fraction parts
      const wholeEl = el.querySelector('.a-price-whole');
      const fractionEl = el.querySelector('.a-price-fraction');
      let askingPrice = null;
      if (wholeEl) {
        const whole = wholeEl.textContent.replace(/[^0-9]/g, '');
        const fraction = fractionEl?.textContent?.replace(/[^0-9]/g, '') || '00';
        askingPrice = parseFloat(`${whole}.${fraction}`);
      }

      // Image
      const imgEl = el.querySelector('.s-image');

      // Link
      const linkEl = el.querySelector('h2 a');

      return {
        title,
        askingPrice,
        imageUrl: imgEl?.src || null,
        platform: 'amazon',
        pageType: 'search_result',
        url: linkEl?.href ? `https://www.amazon.com${linkEl.getAttribute('href')}` : '',
        element: el,
      };
    })
    .filter((item) => item && item.title);
}
