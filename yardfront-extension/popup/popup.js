/**
 * YardFront extension – popup.
 * Sign In must open the frontend (localhost:5173), not the backend.
 */

const API_BASE = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

function showSignInView() {
  document.getElementById('sign-in-view').classList.remove('hidden');
  document.getElementById('logged-in-view').classList.add('hidden');
}

function showLoggedInView() {
  document.getElementById('sign-in-view').classList.add('hidden');
  document.getElementById('logged-in-view').classList.remove('hidden');

  (async () => {
    try {
      const { yf_auth_token } = await chrome.storage.local.get('yf_auth_token');
      const usageRes = await fetch(`${API_BASE}/api/usage`, {
        headers: { Authorization: `Bearer ${yf_auth_token}` },
      });
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        const usageEl = document.getElementById('usage-counter');
        if (usageEl && usageData.used !== undefined && usageData.limit !== undefined) {
          usageEl.textContent = `${usageData.used} of ${usageData.limit} free appraisals used today`;
        }
      }
    } catch (e) {
      console.log('YF: Could not fetch usage', e);
      const usageEl = document.getElementById('usage-counter');
      if (usageEl) usageEl.textContent = '';
    }
  })();
}

document.addEventListener('DOMContentLoaded', async () => {
  const signInBtn = document.getElementById('sign-in') || document.querySelector('[data-action="sign-in"]');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${FRONTEND_URL}/#/login?from=extension` });
    });
  }

  const signOutBtn = document.getElementById('sign-out');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await chrome.storage.local.remove(['yf_auth_token', 'yf_refresh_token']);
      showSignInView();
    });
  }

  const { yf_auth_token } = await chrome.storage.local.get('yf_auth_token');
  if (yf_auth_token) {
    showLoggedInView();
  } else {
    showSignInView();
  }
});
