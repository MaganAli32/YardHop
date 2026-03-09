/**
 * Listens for auth token from ExtensionAuthPage and saves access + refresh token.
 */

window.addEventListener('message', (event) => {
  if (event.data?.type === 'YF_AUTH_TOKEN' && event.data.token) {
    console.log('YardFront auth-receiver: token received!');
    const storageData = { yf_auth_token: event.data.token };
    if (event.data.refreshToken) {
      storageData.yf_refresh_token = event.data.refreshToken;
    }
    chrome.storage.local.set(storageData, () => {
      console.log('YardFront auth-receiver: tokens saved');
      chrome.runtime.sendMessage({ type: 'AUTH_COMPLETE', token: event.data.token });
      setTimeout(() => window.close(), 1500);
    });
  }
});
