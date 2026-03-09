/**
 * eBay scrapers with debug logging and modern search selectors.
 */

function scrapeEbayDetail() {
  console.log('YF: scrapeEbayDetail running');
  const titleEl = document.querySelector('#itemTitle');
  const priceEl = document.querySelector('#prcIsum, .x-price-primary .ux-textspans');
  const imgEl = document.querySelector('#icImg');
  const title = titleEl?.textContent?.trim() || '';
  const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
  return {
    title,
    askingPrice: priceText ? parseFloat(priceText) : null,
    imageUrl: imgEl?.src || null,
    platform: 'ebay',
    pageType: 'detail',
  };
}

function scrapeEbaySearch() {
  console.log('YF: scrapeEbaySearch running');

  // eBay uses .s-item for search result cards
  // Also try .srp-results .s-item__wrapper if .s-item doesn't work
  let listings = document.querySelectorAll('.s-item');

  // Fallback: try newer eBay layout
  if (listings.length === 0) {
    listings = document.querySelectorAll('[data-viewport]');
  }

  console.log('YF: found', listings.length, 'eBay listings');

  return Array.from(listings)
    .map((el) => {
      const titleEl = el.querySelector('.s-item__title span, .s-item__title');
      const priceEl = el.querySelector('.s-item__price');
      const linkEl = el.querySelector('.s-item__link');
      const imgEl = el.querySelector('.s-item__image img');
      const title = titleEl?.textContent?.trim() || '';
      if (title === 'Shop on eBay' || !title) return null;
      const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
      return {
        title,
        askingPrice: priceText ? parseFloat(priceText) : null,
        imageUrl: imgEl?.src || null,
        platform: 'ebay',
        pageType: 'search_result',
        url: linkEl?.href || '',
        element: el,
      };
    })
    .filter((item) => item && item.title);
}
