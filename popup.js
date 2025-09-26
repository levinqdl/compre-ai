// Popup functionality for Compre AI Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get references to UI elements
  const translateText = document.getElementById('translate-text');
  const settingsBtn = document.getElementById('settings-btn');

  // Feature click handlers
  translateText.addEventListener('click', async () => {
    await executeFeature('translate-text', 'Translating text...');
  });

  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome-extension://' + chrome.runtime.id + '/settings.html' });
  });

  // Execute feature function
  async function executeFeature(action, loadingMessage) {
    try {
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
});