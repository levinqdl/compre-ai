// Settings page functionality for Compre AI Translator

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key');
  const targetLanguageSelect = document.getElementById('target-language');
  const apiEndpointInput = document.getElementById('api-endpoint');
  const statusMessage = document.getElementById('status-message');

  // Load existing settings
  loadSettings();

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'translationApiKey',
        'targetLanguage',
        'apiEndpoint'
      ]);

      if (settings.translationApiKey) {
        apiKeyInput.value = settings.translationApiKey;
      }

      if (settings.targetLanguage) {
        targetLanguageSelect.value = settings.targetLanguage;
      }

      if (settings.apiEndpoint) {
        apiEndpointInput.value = settings.apiEndpoint;
      }

      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Error loading settings', 'error');
    }
  }

  async function saveSettings() {
    try {
      const settings = {
        translationApiKey: apiKeyInput.value.trim(),
        targetLanguage: targetLanguageSelect.value,
        apiEndpoint: apiEndpointInput.value.trim() || null
      };

      // Validate API key
      if (!settings.translationApiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }

      // Validate API endpoint if provided
      if (settings.apiEndpoint) {
        try {
          new URL(settings.apiEndpoint);
        } catch (error) {
          showStatus('Please enter a valid API endpoint URL', 'error');
          return;
        }
      }

      // Save to Chrome storage
      await chrome.storage.sync.set(settings);
      
      showStatus('Settings saved successfully! 🎉', 'success');
      console.log('Settings saved:', settings);

      // Test the API connection
      setTimeout(testApiConnection, 1000);

    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  async function testApiConnection() {
    try {
      showStatus('Testing API connection...', 'info');
      
      // Test with a simple phrase
      const testText = 'Hello';
      const settings = await chrome.storage.sync.get([
        'translationApiKey',
        'targetLanguage',
        'apiEndpoint'
      ]);

  const endpointBase = settings.apiEndpoint || (typeof window !== 'undefined' ? window.API_BASE_URL : null) || 'https://your-translation-api.com';
  const endpoint = endpointBase.replace(/\/$/, '') + '/translate';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.translationApiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          to: settings.targetLanguage || 'en',
          detect_source: true
        })
      });

      if (response.ok) {
        showStatus('✅ API connection successful! Extension is ready to use.', 'success');
      } else {
        showStatus(`⚠️  Settings saved, but API test failed (${response.status}). Please check your API key and endpoint.`, 'error');
      }

    } catch (error) {
      showStatus('⚠️  Settings saved, but couldn\'t test API connection. Please verify your setup.', 'error');
      console.error('API test error:', error);
    }
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
      }, 5000);
    }
  }
});