// Popup functionality for Compre AI Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get references to UI elements
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const userInfo = document.getElementById('user-info');
  const statusMessage = document.getElementById('status-message');
  const siteToggle = document.getElementById('site-toggle');
  const siteNameDisplay = document.getElementById('site-name');
  const siteToggleHint = document.getElementById('site-toggle-hint');
  const SITE_PREF_KEY = 'enabledSites';
  let currentHostname = '';
  let cachedEnabledSites = [];
  let siteEnabled = false;

  // Load authentication status
  loadAuthStatus();

  // Authentication handlers
  loginBtn.addEventListener('click', async () => {
    await handleLogin();
  });

  logoutBtn.addEventListener('click', async () => {
    await handleLogout();
  });

  if (siteToggle) {
    initSiteToggle().catch((error) => {
      console.error('Site toggle init error:', error);
      disableToggle('Unavailable on this page');
    });
    siteToggle.addEventListener('change', handleSiteToggleChange);
  }

  async function initSiteToggle() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      disableToggle('Unavailable on this page');
      return;
    }

    let pageUrl;
    try {
      pageUrl = new URL(tab.url);
    } catch (error) {
      console.error('Invalid tab URL', error);
      disableToggle('Unavailable on this page');
      return;
    }

    if (!['http:', 'https:'].includes(pageUrl.protocol)) {
      disableToggle('Unavailable on this page');
      return;
    }

    currentHostname = pageUrl.hostname.toLowerCase();
    if (siteNameDisplay) {
      siteNameDisplay.textContent = currentHostname;
    }

    cachedEnabledSites = await loadEnabledSites();
    updateToggleUI(cachedEnabledSites.includes(currentHostname));
  }

  async function handleSiteToggleChange(event) {
    if (!currentHostname) {
      return;
    }

    siteToggle.disabled = true;
    const targetState = event.target.checked;
    const previousState = siteEnabled;

    try {
      cachedEnabledSites = await loadEnabledSites();
      const normalized = new Set(cachedEnabledSites);

      if (targetState) {
        normalized.add(currentHostname);
      } else {
        normalized.delete(currentHostname);
      }

      const updated = Array.from(normalized);
      await chrome.storage.sync.set({ [SITE_PREF_KEY]: updated });
      cachedEnabledSites = updated;
      updateToggleHint(targetState);

      const type = targetState ? 'success' : 'info';
      const message = targetState
        ? `Compre AI enabled on ${currentHostname}`
        : `Compre AI disabled on ${currentHostname}`;
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

  async function loadEnabledSites() {
    try {
      const stored = await chrome.storage.sync.get([SITE_PREF_KEY]);
      const list = stored[SITE_PREF_KEY];
      if (!Array.isArray(list)) {
        return [];
      }
      return list
        .map((item) => (item || '').toString().toLowerCase().trim())
        .filter(Boolean);
    } catch (error) {
      console.error('Error loading enabled sites', error);
      return [];
    }
  }

  function updateToggleUI(enabled) {
    siteEnabled = enabled;
    if (siteToggle) {
      siteToggle.disabled = false;
      siteToggle.checked = enabled;
    }
    if (siteToggleHint) {
      siteToggleHint.textContent = enabled ? 'Enabled for this page' : 'Disabled for this page';
    }
  }

  function updateToggleHint(enabled) {
    siteEnabled = enabled;
    if (siteToggleHint) {
      siteToggleHint.textContent = enabled ? 'Enabled for this page' : 'Disabled for this page';
    }
  }

  function disableToggle(message) {
    siteEnabled = false;
    if (siteToggle) {
      siteToggle.checked = false;
      siteToggle.disabled = true;
    }
    if (siteNameDisplay) {
      siteNameDisplay.textContent = '';
    }
    if (siteToggleHint) {
      siteToggleHint.textContent = message;
    }
  }

  // Authentication functions
  async function loadAuthStatus() {
    try {
      // Check authentication using the /api/verify endpoint
      const loginUrl = (typeof window !== 'undefined' ? window.API_BASE_URL : null) || 'https://your-translation-api.com';
      
      const response = await fetch(`${loginUrl}/api/verify`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          showLoggedInState(data.user);
        } else {
          showLoggedOutState();
        }
      } else {
        showLoggedOutState();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoggedOutState();
    }
  }

  async function handleLogin() {
    try {
      showAuthStatus('Redirecting to login...', 'info');
      
      const loginUrl = (typeof window !== 'undefined' ? window.API_BASE_URL : null) || 'https://your-translation-api.com';
      
      // Open login page in the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.update(tab.id, { url: `${loginUrl}?client_type=extension` });
      
    } catch (error) {
      console.error('Login error:', error);
      showAuthStatus('❌ Failed to redirect to login page.', 'error');
    }
  }

  async function handleLogout() {
    try {
      const loginUrl = (typeof window !== 'undefined' ? window.API_BASE_URL : null) || 'https://your-translation-api.com';
      
      // Open login page for user to logout there
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.update(tab.id, { url: `${loginUrl}?client_type=extension` });
      
    } catch (error) {
      console.error('Logout error:', error);
      showAuthStatus('❌ Failed to redirect to logout page.', 'error');
    }
  }

  function showLoggedInState(userData) {
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
    
    if (userData && userData.name) {
      userInfo.innerHTML = `Welcome, ${userData.name}!`;
      if (userData.email) {
        userInfo.innerHTML += `<br><span style="font-size: 10px; opacity: 0.7;">${userData.email}</span>`;
      }
    } else {
      userInfo.innerHTML = 'Welcome!';
    }
  }

  function showLoggedOutState() {
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
  }

  function showAuthStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
      }, 3000);
    }
  }

  function showNotification(message, type) {
    showAuthStatus(message, type);
  }
});