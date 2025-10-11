/// <reference types="chrome" />

document.addEventListener('DOMContentLoaded', function() {
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement | null;
  const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
  const loggedOutView = document.getElementById('logged-out-view') as HTMLElement | null;
  const loggedInView = document.getElementById('logged-in-view') as HTMLElement | null;
  const userInfo = document.getElementById('user-info') as HTMLElement | null;
  const statusMessage = document.getElementById('status-message') as HTMLElement | null;
  const siteToggle = document.getElementById('site-toggle') as HTMLInputElement | null;
  const siteNameDisplay = document.getElementById('site-name') as HTMLElement | null;
  const siteToggleHint = document.getElementById('site-toggle-hint') as HTMLElement | null;
  const SITE_PREF_KEY = 'enabledSites';
  let currentHostname = '';
  let cachedEnabledSites: string[] = [];
  let siteEnabled = false;

  loadAuthStatus();

  if (loginBtn) loginBtn.addEventListener('click', async () => { await handleLogin(); });
  if (logoutBtn) logoutBtn.addEventListener('click', async () => { await handleLogout(); });

  if (siteToggle) {
    initSiteToggle().catch((error) => { console.error('Site toggle init error:', error); disableToggle('Unavailable on this page'); });
    siteToggle.addEventListener('change', handleSiteToggleChange);
  }

  async function initSiteToggle(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.url) { disableToggle('Unavailable on this page'); return; }
    let pageUrl;
    try { pageUrl = new URL(tab.url); } catch (error) { console.error('Invalid tab URL', error); disableToggle('Unavailable on this page'); return; }
    if (!['http:', 'https:'].includes(pageUrl.protocol)) { disableToggle('Unavailable on this page'); return; }
    currentHostname = pageUrl.hostname.toLowerCase();
    if (siteNameDisplay) { siteNameDisplay.textContent = currentHostname; }
    cachedEnabledSites = await loadEnabledSites();
    updateToggleUI(cachedEnabledSites.includes(currentHostname));
  }

  async function handleSiteToggleChange(event: Event) {
    if (!siteToggle || !(event.target instanceof HTMLInputElement)) return;
    if (!currentHostname) { return; }
    siteToggle.disabled = true;
    const targetState = event.target.checked;
    const previousState = siteEnabled;
    try {
      cachedEnabledSites = await loadEnabledSites();
      const normalized = new Set(cachedEnabledSites);
      if (targetState) { normalized.add(currentHostname); } else { normalized.delete(currentHostname); }
      const updated = Array.from(normalized);
      await chrome.storage.sync.set({ [SITE_PREF_KEY]: updated });
      cachedEnabledSites = updated;
      updateToggleHint(targetState);
      const type = targetState ? 'success' : 'info';
      const message = targetState ? `Compre AI enabled on ${currentHostname}` : `Compre AI disabled on ${currentHostname}`;
      showNotification(message, type);
    } catch (error) {
      console.error('Error updating site preference', error);
      updateToggleUI(previousState);
      siteToggle.checked = previousState;
      showNotification('Unable to update site preference.', 'error');
    } finally {
      siteToggle.disabled = false;
    }
  }

  async function loadEnabledSites(): Promise<string[]> {
    try {
      const stored = await chrome.storage.sync.get([SITE_PREF_KEY]);
      const list = stored[SITE_PREF_KEY];
      if (!Array.isArray(list)) { return []; }
      return list.map((item) => (item || '').toString().toLowerCase().trim()).filter(Boolean);
    } catch (error) {
      console.error('Error loading enabled sites', error);
      return [];
    }
  }

  function updateToggleUI(enabled: boolean): void {
    siteEnabled = enabled;
    if (siteToggle) { siteToggle.disabled = false; siteToggle.checked = enabled; }
    if (siteToggleHint) { siteToggleHint.textContent = enabled ? 'Enabled for this page' : 'Disabled for this page'; }
  }

  function updateToggleHint(enabled: boolean): void {
    siteEnabled = enabled;
    if (siteToggleHint) { siteToggleHint.textContent = enabled ? 'Enabled for this page' : 'Disabled for this page'; }
  }

  function disableToggle(message: string): void {
    siteEnabled = false;
    if (siteToggle) { siteToggle.checked = false; siteToggle.disabled = true; }
    if (siteNameDisplay) { siteNameDisplay.textContent = ''; }
    if (siteToggleHint) { siteToggleHint.textContent = message; }
  }

  async function loadAuthStatus(): Promise<void> {
    try {
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      const response = await fetch(`${loginUrl}/api/verify`, { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) { showLoggedInState(data.user); } else { showLoggedOutState(); }
      } else {
        showLoggedOutState();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoggedOutState();
    }
  }

  async function handleLogin(): Promise<void> {
    try {
      showAuthStatus('Redirecting to login...', 'info');
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id) await chrome.tabs.update(tab.id, { url: `${loginUrl}?client_type=extension` });
    } catch (error) {
      console.error('Login error:', error);
      showAuthStatus('❌ Failed to redirect to login page.', 'error');
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      const loginUrl = ((window as any).API_BASE_URL) || 'https://your-translation-api.com';
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id) await chrome.tabs.update(tab.id, { url: `${loginUrl}?client_type=extension` });
    } catch (error) {
      console.error('Logout error:', error);
      showAuthStatus('❌ Failed to redirect to logout page.', 'error');
    }
  }

  function showLoggedInState(userData: any): void {
    if (!loggedOutView || !loggedInView || !userInfo) return;
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
    if (userData && userData.name) {
      userInfo.innerHTML = `Welcome, ${userData.name}!`;
      if (userData.email) { userInfo.innerHTML += `<br><span style="font-size: 10px; opacity: 0.7;">${userData.email}</span>`; }
    } else {
      userInfo.innerHTML = 'Welcome!';
    }
  }

  function showLoggedOutState(): void {
    if (!loggedOutView || !loggedInView) return;
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
  }

  function showAuthStatus(message: string, type: 'success' | 'info' | 'error'): void {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    if (type === 'success') {
      setTimeout(() => { if (statusMessage) { statusMessage.textContent = ''; statusMessage.className = 'status-message'; } }, 3000);
    }
  }

  function showNotification(message: string, type: 'success' | 'info' | 'error'): void { showAuthStatus(message, type); }
});
