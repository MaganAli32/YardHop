/**
 * Craigslist scrapers – DO NOT MODIFY (working fine).
 * Minimal stubs so detector can run; replace with full implementation if needed.
 */

function scrapeCraigslistDetail() {
  const titleEl = document.querySelector('.postingtitletext');
  const priceEl = document.querySelector('.price');
  const imgEl = document.querySelector('.gallery img');
  const title = titleEl?.textContent?.trim() || '';
  const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
  return {
    title,
    askingPrice: priceText ? parseFloat(priceText) : null,
    imageUrl: imgEl?.src || null,
    platform: 'craigslist',
    pageType: 'detail',
  };
}

function scrapeCraigslistSearch() {
  const listings = document.querySelectorAll('.result-row');
  return Array.from(listings)
    .map((el) => {
      const titleEl = el.querySelector('.result-title');
      const priceEl = el.querySelector('.result-price');
      const linkEl = el.querySelector('a.result-image');
      const title = titleEl?.textContent?.trim() || '';
      if (!title) return null;
      const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '';
      return {
        title,
        askingPrice: priceText ? parseFloat(priceText) : null,
        imageUrl: null,
        platform: 'craigslist',
        pageType: 'search_result',
        url: titleEl?.href || linkEl?.href || '',
        element: el,
      };
    })
    .filter((item) => item && item.title);
}
