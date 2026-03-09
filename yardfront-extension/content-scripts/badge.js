/**
 * Badge injection — search badges with optional refinement pulse.
 */

const VERDICT_LABELS = {
  great_deal: 'Great Deal',
  fair: 'Fair Price',
  above_market: 'Above Market',
  overpriced: 'Overpriced',
  unknown: 'Estimate',
};

function injectLoadingBadge() {
  console.log('YF: injectLoadingBadge');
}

function injectDetailBadge(result, platform) {
  console.log('YF: injectDetailBadge', result?.verdict, platform);
}

function injectErrorBadge(message) {
  console.log('YF: injectErrorBadge', message);
}

function injectSearchBadge(result, listingElement) {
  const existingBadge = listingElement.querySelector('.yf-badge-search');
  const isUpdate = !!existingBadge;
  if (existingBadge) existingBadge.remove();

  const verdict = result.verdict || 'fair';
  const badge = document.createElement('span');
  badge.className = `yf-badge-search yf-badge yf-badge--${verdict}`.replace('--undefined', '--fair');
  badge.textContent = VERDICT_LABELS[verdict] || verdict || 'Fair Price';

  const range = result.estimatedRange || result.marketRange;
  if (range) {
    badge.title = `YardFront: Market $${Math.round(range.low)} – $${Math.round(range.high)}`;
    if (result.dataPoints) {
      badge.title += ` (${result.dataPoints} sources)`;
    }
  }

  if (isUpdate) {
    badge.style.animation = 'yf-pulse 0.5s ease-out';
  }

  const priceEl = listingElement.querySelector('.result-price, .s-item__price, .priceinfo, .price, .a-price, .a-price-whole');
  if (priceEl) {
    const anchor = priceEl.closest('.a-price') || priceEl;
    const parent = anchor.parentNode;
    if (parent) {
      parent.insertBefore(badge, anchor.nextSibling);
    }
    if (!badge.parentNode) {
      (anchor.parentNode || listingElement).appendChild(badge);
    }
  } else {
    listingElement.appendChild(badge);
  }
}

function injectSearchBadges(listings, results) {
  if (!listings || !results || typeof injectSearchBadge !== 'function') return;
  const len = Math.min(listings.length, results.length);
  for (let i = 0; i < len; i++) {
    if (listings[i].element && results[i] && !results[i].limitReached) {
      injectSearchBadge(results[i], listings[i].element);
    }
  }
}
