/**
 * YardFront extension – background service worker.
 * Use API_BASE for backend API calls; use FRONTEND_URL for opening login/extension-auth tabs.
 * Set SUPABASE_URL and SUPABASE_ANON_KEY to match your frontend .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 */

const API_BASE = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// Copy from frontend .env for token refresh (same as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';

function openLoginTab() {
  chrome.tabs.create({ url: `${FRONTEND_URL}/#/login?from=extension` });
}

function hashString(str) {
  if (!str || typeof str !== 'string') return '0';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

async function refreshAccessToken() {
  const { yf_refresh_token } = await chrome.storage.local.get('yf_refresh_token');
  if (!yf_refresh_token) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: yf_refresh_token }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.access_token) {
      await chrome.storage.local.set({
        yf_auth_token: data.access_token,
        yf_refresh_token: data.refresh_token || yf_refresh_token,
      });
      return data.access_token;
    }
  } catch (err) {
    console.error('YF: Token refresh failed', err);
  }
  return null;
}

async function handleExpiredToken(tabId) {
  const newToken = await refreshAccessToken();
  if (newToken) {
    console.log('YF: Token refreshed successfully');
    chrome.tabs.query({}, (tabs) => {
      const patterns = ['craigslist.org', 'ebay.com', 'amazon.com'];
      tabs.forEach((tab) => {
        if (tab.url && patterns.some((p) => tab.url.includes(p))) chrome.tabs.reload(tab.id);
      });
    });
    return;
  }

  await chrome.storage.local.remove(['yf_auth_token', 'yf_refresh_token']);
  chrome.tabs.create({ url: `${FRONTEND_URL}/#/login?from=extension` });
  if (tabId) {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_ERROR', error: 'Session expired. Please sign in again.' });
    } catch (_) {}
  }
}

async function callFullAppraisal(data, token) {
  const url = `${API_BASE}/api/appraise/extension`;
  const body = {
    title: data.title,
    askingPrice: data.askingPrice,
    imageUrl: data.imageUrl,
    platform: data.platform || 'unknown',
  };
  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
        body: JSON.stringify(body),
      });
    }
    if (!response.ok) {
      await handleExpiredToken();
      throw new Error('Session expired');
    }
  }

  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    return {
      error: data.message || 'Daily limit reached',
      limitReached: true,
      usage: data.usage,
      limit: data.limit,
      upgradeUrl: data.upgradeUrl,
    };
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { error: err.error || response.statusText };
  }
  return response.json();
}

async function callQuickAppraisal(data, token) {
  const url = `${API_BASE}/api/appraise/quick`;
  const body = { title: data.title, askingPrice: data.askingPrice };
  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
        body: JSON.stringify(body),
      });
    }
    if (!response.ok) {
      await handleExpiredToken();
      throw new Error('Session expired');
    }
  }

  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    return {
      error: data.message || 'Daily limit reached',
      limitReached: true,
      usage: data.usage,
      limit: data.limit,
      upgradeUrl: data.upgradeUrl,
    };
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { error: err.error || response.statusText };
  }
  const result = await response.json();
  return {
    verdict: result.verdict,
    marketRange: result.estimatedRange || result.marketRange,
  };
}

async function handleRefineAppraisal(data, token) {
  const cacheKey = `yf_refined_${hashString(data.title)}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    const entry = cached[cacheKey];
    if (Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) return entry.result;
  }

  let response = await fetch(`${API_BASE}/api/appraise/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ title: data.title, askingPrice: data.askingPrice }),
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(`${API_BASE}/api/appraise/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
        body: JSON.stringify({ title: data.title, askingPrice: data.askingPrice }),
      });
    }
    if (!response.ok) {
      await handleExpiredToken();
      throw new Error('Session expired');
    }
  }

  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    return { limitReached: true, ...body };
  }

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const result = await response.json();
  await chrome.storage.local.set({ [cacheKey]: { result, timestamp: Date.now() } });
  return result;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_LOGIN') {
    openLoginTab();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'APPRAISE_FULL') {
    (async () => {
      try {
        const result = await callFullAppraisal(msg.data, msg.token);
        sendResponse(result);
      } catch (err) {
        sendResponse({ error: err.message || 'Appraisal failed' });
      }
    })();
    return true;
  }

  if (msg.type === 'APPRAISE_QUICK') {
    (async () => {
      try {
        const result = await callQuickAppraisal(msg.data, msg.token);
        sendResponse(result);
      } catch (err) {
        sendResponse({ error: err.message || 'Quick appraisal failed' });
      }
    })();
    return true;
  }

  if (msg.type === 'APPRAISE_SEARCH') {
    (async () => {
      try {
        const { listings, token } = msg;
        if (!listings || !token) {
          sendResponse([]);
          return;
        }
        const results = await Promise.all(
          listings.map((item) =>
            callQuickAppraisal(
              { title: item.title, askingPrice: item.askingPrice },
              token
            ).then((r) => (r && !r.error ? r : { verdict: 'unknown' }))
          )
        );
        sendResponse(results);
      } catch (err) {
        sendResponse([]);
      }
    })();
    return true;
  }

  if (msg.type === 'APPRAISE_REFINE') {
    (async () => {
      try {
        const result = await handleRefineAppraisal(msg.data, msg.token);
        sendResponse(result);
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  return true;
});
