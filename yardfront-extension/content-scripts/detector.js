/**
 * Platform and page-type detection; runs search or detail appraisal flow.
 */

(function () {
  const url = window.location.href;
  let platform = null;
  let pageType = null;

  if (url.includes('craigslist.org')) {
    platform = 'craigslist';
    pageType = url.includes('/search/') ? 'search' : 'detail';
  } else if (url.includes('ebay.com')) {
    platform = 'ebay';
    pageType = url.includes('/sch/') ? 'search' : 'detail';
  } else if (url.includes('amazon.com')) {
    platform = 'amazon';
    pageType = (url.includes('/s?') || url.includes('/s/')) ? 'search' : 'detail';
  }

  console.log('YF detector: platform=', platform, 'pageType=', pageType, 'url=', url);

  if (!platform) return;

  const searchScrapers = {
    craigslist: typeof scrapeCraigslistSearch === 'function' ? scrapeCraigslistSearch : null,
    ebay: typeof scrapeEbaySearch === 'function' ? scrapeEbaySearch : null,
    amazon: typeof scrapeAmazonSearch === 'function' ? scrapeAmazonSearch : null,
  };

  async function run() {
    let auth = { yf_auth_token: null };
    try {
      auth = await new Promise((resolve) => {
        chrome.storage.local.get('yf_auth_token', (data) => resolve(data || {}));
      });
    } catch (_) {}
    if (!auth.yf_auth_token) {
      console.log('YF detector: no auth token, skipping');
      return;
    }

    if (pageType === 'search') {
      const scraper = searchScrapers[platform];
      if (!scraper) return;
      const allListings = scraper();
      const listings = (allListings || []).slice(0, 20);
      console.log('YF detector: scraped', listings.length, 'listings');
      if (listings.length === 0) return;

      function hashString(str) {
        if (!str || typeof str !== 'string') return '0';
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
        return Math.abs(h).toString(36);
      }

      const BATCH_SIZE = 6;
      const processedListings = [];

      for (let i = 0; i < listings.length; i += BATCH_SIZE) {
        const batch = listings.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (listing) => {
            if (!listing.title || listing.askingPrice == null) return null;
            const refinedKey = `yf_refined_${hashString(listing.title)}`;
            const cached = await chrome.storage.local.get(refinedKey);
            if (cached[refinedKey] && Date.now() - cached[refinedKey].timestamp < 24 * 60 * 60 * 1000) {
              return { listing, result: cached[refinedKey].result, isRefined: true };
            }
            const result = await new Promise((resolve) => {
              chrome.runtime.sendMessage(
                {
                  type: 'APPRAISE_QUICK',
                  data: { title: listing.title, askingPrice: listing.askingPrice },
                  token: auth.yf_auth_token,
                },
                resolve
              );
            });
            if (result && result.limitReached) return { listing, result, limitReached: true };
            return { listing, result, isRefined: false };
          })
        );

        results.forEach((item) => {
          if (!item) return;
          if (item.limitReached) return;
          if (item.result && item.result.verdict && item.listing.element && typeof injectSearchBadge === 'function') {
            injectSearchBadge(item.result, item.listing.element);
            if (!item.isRefined) processedListings.push(item.listing);
          }
        });

        if (results.some((r) => r && r.limitReached)) {
          if (typeof injectErrorBadge === 'function') injectErrorBadge('Daily limit reached — upgrade to Pro');
          return;
        }
        if (i + BATCH_SIZE < listings.length) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      for (const listing of processedListings) {
        try {
          const refinedResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'APPRAISE_REFINE',
                data: { title: listing.title, askingPrice: listing.askingPrice },
                token: auth.yf_auth_token,
              },
              resolve
            );
          });
          if (refinedResult && refinedResult.limitReached) break;
          if (refinedResult && refinedResult.refined && refinedResult.verdict && listing.element) {
            const oldBadge = listing.element.querySelector('.yf-badge-search');
            if (oldBadge) oldBadge.remove();
            if (typeof injectSearchBadge === 'function') {
              injectSearchBadge(refinedResult, listing.element);
            }
          }
        } catch (e) {
          console.log('YF: Refine failed for', listing.title, e);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      return;
    }

    if (pageType === 'detail') {
      const scrapers = {
        craigslist: typeof scrapeCraigslistDetail === 'function' ? scrapeCraigslistDetail : null,
        ebay: typeof scrapeEbayDetail === 'function' ? scrapeEbayDetail : null,
        amazon: typeof scrapeAmazonDetail === 'function' ? scrapeAmazonDetail : null,
      };

      const scraper = scrapers[platform];
      if (!scraper) return;

      const data = scraper();
      if (!data.title) return;

      if (typeof injectLoadingBadge === 'function') injectLoadingBadge();

      const timeoutMs = 30000;

      const resultPromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'APPRAISE_FULL', data, token: auth.yf_auth_token },
          resolve
        );
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ timeout: true }), timeoutMs);
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);

      if (result && result.timeout) {
        if (data.askingPrice) {
          console.log('YF: Full appraisal timed out, falling back to quick');
          const quickResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'APPRAISE_QUICK',
                data: { title: data.title, askingPrice: data.askingPrice },
                token: auth.yf_auth_token,
              },
              resolve
            );
          });
          if (quickResult && quickResult.verdict && typeof injectDetailBadge === 'function') {
            injectDetailBadge(quickResult, platform);
          } else if (typeof injectErrorBadge === 'function') {
            injectErrorBadge('Appraisal timed out');
          }
        } else if (typeof injectErrorBadge === 'function') {
          injectErrorBadge('Appraisal timed out');
        }
      } else if (result && result.limitReached) {
        if (typeof injectErrorBadge === 'function') {
          injectErrorBadge('Daily limit reached — upgrade to Pro');
        }
      } else if (result && result.verdict && typeof injectDetailBadge === 'function') {
        injectDetailBadge(result, platform);
      } else if (result && result.error && typeof injectErrorBadge === 'function') {
        injectErrorBadge(result.error);
      }
    }
  }

  run();
})();
