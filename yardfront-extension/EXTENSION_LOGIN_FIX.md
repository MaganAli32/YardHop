# Extension login URL fix

The extension must open the **frontend** (localhost:5173) for login, not the backend (localhost:3000).

## 1. Define both URLs

In `background/service-worker.js` (and in `popup/popup.js` if it calls the API or opens login):

```js
const API_BASE = 'http://localhost:3000';   // backend – for API calls only
const FRONTEND_URL = 'http://localhost:5173'; // frontend – for login / extension-auth
```

## 2. Open login tab on the frontend

Wherever the extension opens the login tab (e.g. in the service worker or when "Sign In" is clicked), use the **frontend** URL and the hash route:

```js
chrome.tabs.create({ url: `${FRONTEND_URL}/#/login?from=extension` });
```

**Wrong:** `chrome.tabs.create({ url: `${API_BASE}/login?from=extension` });`  
(That opens the backend; the login page is served by the frontend.)

## 3. Popup "Sign In" button

In `popup/popup.js`, the Sign In button should open the same URL:

```js
// When user clicks Sign In:
chrome.tabs.create({ url: 'http://localhost:5173/#/login?from=extension' });
// Or use FRONTEND_URL if you have it in popup:
const FRONTEND_URL = 'http://localhost:5173';
chrome.tabs.create({ url: `${FRONTEND_URL}/#/login?from=extension` });
```

## 4. Expected flow

1. Extension popup → user clicks Sign In.
2. New tab opens: `http://localhost:5173/#/login?from=extension`.
3. User logs in on the frontend.
4. Frontend redirects to `http://localhost:5173/#/extension-auth` (from=extension is preserved; see LoginPage.tsx).
5. Extension-auth page sends token via postMessage; extension stores it and can close the tab.

The frontend (LoginPage.tsx) now reads `from=extension` from both the hash and `location.search`, and redirects to `/extension-auth` after login.
