// Popup functionality for Compre AI Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get references to UI elements
  const translateText = document.getElementById('translate-text');
  const settingsBtn = document.getElementById('settings-btn');
  const siteToggle = document.getElementById('site-toggle');
  const siteNameDisplay = document.getElementById('site-name');
  const siteToggleHint = document.getElementById('site-toggle-hint');
  const SITE_PREF_KEY = 'disabledSites';
  let currentHostname = '';
  let cachedDisabledSites = [];
  let siteEnabled = true;

  // Feature click handlers
  translateText.addEventListener('click', async () => {
    await executeFeature('translate-text', 'Translating text...');
  });

  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome-extension://' + chrome.runtime.id + '/settings.html' });
  });

  if (siteToggle) {
    initSiteToggle().catch((error) => {
      console.error('Site toggle init error:', error);
      disableToggle('Unavailable on this page');
    });
    siteToggle.addEventListener('change', handleSiteToggleChange);
  }

  // Execute feature function
  async function executeFeature(action, loadingMessage) {
    try {
      if (!siteEnabled) {
        showNotification('Compre AI is disabled on this site.', 'error');
        return;
      }
      // Show loading state
      showNotification(loadingMessage, 'info');
      
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showNotification('No active tab found', 'error');
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: action,
        url: tab.url,
        title: tab.title
      });

      if (response && response.success) {
        showNotification(response.message || 'Translation completed successfully', 'success');
      } else {
        showNotification(response?.error || 'Translation failed', 'error');
      }
    } catch (error) {
      console.error('Translation error:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  }

  // Show notification function
  function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      max-width: 250px;
      text-align: center;
      ${type === 'success' ? 'background: #4CAF50; color: white;' : 
        type === 'error' ? 'background: #f44336; color: white;' : 
        'background: rgba(255, 255, 255, 0.9); color: #333;'}
    `;

    document.body.appendChild(notification);

    // Auto-remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
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

    cachedDisabledSites = await loadDisabledSites();
    updateToggleUI(!cachedDisabledSites.includes(currentHostname));
  }

  async function handleSiteToggleChange(event) {
    if (!currentHostname) {
      return;
    }

    siteToggle.disabled = true;
    const targetState = event.target.checked;
    const previousState = siteEnabled;

    try {
      cachedDisabledSites = await loadDisabledSites();
      const normalized = new Set(cachedDisabledSites);

      if (targetState) {
        normalized.delete(currentHostname);
      } else {
        normalized.add(currentHostname);
      }

      const updated = Array.from(normalized);
      await chrome.storage.sync.set({ [SITE_PREF_KEY]: updated });
      cachedDisabledSites = updated;
      updateToggleUI(targetState);

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

  async function loadDisabledSites() {
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
      console.error('Error loading disabled sites', error);
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
});