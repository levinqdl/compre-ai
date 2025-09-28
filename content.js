// Content script for Compre AI Chrome Extension
// This script runs on all web pages and handles text selection and side panel display

(function() {
  'use strict';

  let isSelecting = false;
  let sidePanel = null;
  let selectionTimeout = null;

  // Initialize the extension
  init();

  function init() {
    // Listen for text selection events
    // document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', debounceSelectionChange);
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      handleMessage(request, sender, sendResponse);
      return true;
    });

    console.log('Compre AI content script initialized');
  }

  // Debounced selection change handler
  function debounceSelectionChange() {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }
    
    selectionTimeout = setTimeout(() => {
      const selectedText = getSelectedText();
      if (selectedText && selectedText.length > 0) {
        showSidePanel(selectedText);
      }
    }, 300);
  }

  function getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  function showSidePanel(selectedText) {
    if (sidePanel) {
      // Panel already exists, just update the selected text
      updateSelectedText(selectedText);
    } else {
      // Create new panel
      sidePanel = createSidePanel(selectedText);
      document.body.appendChild(sidePanel);
      
      // Animate in
      setTimeout(() => {
        sidePanel.classList.add('compre-ai-panel-visible');
      }, 10);
    }
  }

  function updateSelectedText(selectedText) {
    if (!sidePanel) return;
    
    const textDisplay = sidePanel.querySelector('.compre-ai-text-display');
    const translateBtn = sidePanel.querySelector('.compre-ai-translate-btn');
    const resultDiv = sidePanel.querySelector('#translation-result');
    const errorDiv = sidePanel.querySelector('#error-display');
    
    // Update the displayed text
    textDisplay.innerHTML = escapeHtml(selectedText);
    
    // Hide previous translation results/errors since text changed
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    // Reset translate button state and update its click handler
    translateBtn.disabled = false;
    const btnText = translateBtn.querySelector('.btn-text');
    const btnSpinner = translateBtn.querySelector('.btn-spinner');
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    
    // Remove old event listener and add new one with updated text
    const newTranslateBtn = translateBtn.cloneNode(true);
    translateBtn.parentNode.replaceChild(newTranslateBtn, translateBtn);
    newTranslateBtn.addEventListener('click', () => translateText(selectedText, sidePanel));
  }

  function hideSidePanel() {
    if (sidePanel) {
      sidePanel.classList.remove('compre-ai-panel-visible');
      setTimeout(() => {
        if (sidePanel && sidePanel.parentNode) {
          sidePanel.parentNode.removeChild(sidePanel);
        }
        sidePanel = null;
      }, 300);
    }
  }

  function createSidePanel(selectedText) {
    const panel = document.createElement('div');
    panel.className = 'compre-ai-side-panel';
    panel.innerHTML = `
      <div class="compre-ai-panel-header">
        <h3>Compre AI Translator</h3>
        <button class="compre-ai-close-btn" title="Close">&times;</button>
      </div>
      
      <div class="compre-ai-panel-content">
        <div class="compre-ai-selected-text">
          <label>Selected Text:</label>
          <div class="compre-ai-text-display">${escapeHtml(selectedText)}</div>
        </div>
        
        <div class="compre-ai-translate-section">
          <button class="compre-ai-translate-btn" id="translate-btn">
            <span class="btn-text">Translate</span>
            <span class="btn-spinner" style="display: none;">⟳</span>
          </button>
        </div>
        
        <div class="compre-ai-translation-result" id="translation-result" style="display: none;">
          <label>Translation:</label>
          <div class="compre-ai-result-display"></div>
        </div>
        
        <div class="compre-ai-error" id="error-display" style="display: none;">
          <div class="compre-ai-error-message"></div>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = panel.querySelector('.compre-ai-close-btn');
    closeBtn.addEventListener('click', hideSidePanel);
    
    const translateBtn = panel.querySelector('.compre-ai-translate-btn');
    translateBtn.addEventListener('click', () => translateText(selectedText, panel));

    // Add styles if not already added
    addStyles();
    
    return panel;
  }

  async function translateText(text, panel) {
    const translateBtn = panel.querySelector('.compre-ai-translate-btn');
    const btnText = translateBtn.querySelector('.btn-text');
    const btnSpinner = translateBtn.querySelector('.btn-spinner');
    const resultDiv = panel.querySelector('#translation-result');
    const errorDiv = panel.querySelector('#error-display');
    
    // Show loading state
    translateBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    // Hide previous results/errors
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
      const result = await callTranslationAPI(text);
      
      if (result.success) {
        // Show translation result
        const resultDisplay = panel.querySelector('.compre-ai-result-display');
        
        resultDisplay.textContent = result.translation;
        
        resultDiv.style.display = 'block';
      } else {
        // Show error
        const errorMessage = panel.querySelector('.compre-ai-error-message');
        errorMessage.textContent = result.error || 'Translation failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      // Show error
      const errorMessage = panel.querySelector('.compre-ai-error-message');
      errorMessage.textContent = 'Translation service error: ' + error.message;
      errorDiv.style.display = 'block';
    }
    
    // Reset button state
    translateBtn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }

  // Translation API call function
  async function callTranslationAPI(text) {
    try {
      // Determine API endpoint
      const stored = await chrome.storage.sync.get(['apiEndpoint']);
      const base = stored.apiEndpoint || (typeof globalThis !== 'undefined' && globalThis.API_BASE_URL) || 'https://your-translation-api.com';
      const API_ENDPOINT = base.replace(/\/$/, '') + '/translate';
      const API_KEY = await getApiKey();
      const TARGET_LANGUAGE = await getTargetLanguage();
      
      if (!API_KEY) {
        return {
          success: false,
          error: 'API key not configured. Please set up your translation API key in extension settings.'
        };
      }

      // Prepare request payload
      const requestBody = {
        text: text,
        to: TARGET_LANGUAGE || 'en',
        detect_source: true
      };

      // Make API request
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        translation: data.translated_text || data.translation || text,
        detectedLanguage: data.detected_language || 'unknown',
        to: data.target_language || TARGET_LANGUAGE,
        confidence: data.confidence || null
      };

    } catch (error) {
      console.error('Translation API error:', error);
      return {
        success: false,
        error: `Translation service error: ${error.message}`
      };
    }
  }

  // Get API key from Chrome storage
  async function getApiKey() {
    try {
      const result = await chrome.storage.sync.get(['translationApiKey']);
      return result.translationApiKey || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  // Get target language from Chrome storage
  async function getTargetLanguage() {
    try {
      const result = await chrome.storage.sync.get(['targetLanguage']);
      return result.targetLanguage || 'en';
    } catch (error) {
      console.error('Error getting target language:', error);
      return 'en';
    }
  }

  // Handle messages from popup/background
  async function handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'get-selected-text':
          const selectedText = getSelectedText();
          sendResponse({ success: true, selectedText });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addStyles() {
    // Check if styles already added
    if (document.getElementById('compre-ai-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'compre-ai-styles';
    style.textContent = `
      .compre-ai-side-panel {
        position: fixed;
        top: 0;
        right: -400px;
        width: 380px;
        height: 100vh;
        background: #ffffff;
        border-left: 2px solid #e0e0e0;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: right 0.3s ease-in-out;
        overflow-y: auto;
        font-size: 14px;
      }
      
      .compre-ai-panel-visible {
        right: 0 !important;
      }
      
      .compre-ai-panel-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      .compre-ai-panel-header h3 {
        margin: 0;
        color: #333;
        font-size: 16px;
        font-weight: 600;
      }
      
      .compre-ai-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .compre-ai-close-btn:hover {
        background: #e0e0e0;
      }
      
      .compre-ai-panel-content {
        padding: 20px;
      }
      
      .compre-ai-selected-text {
        margin-bottom: 20px;
      }
      
      .compre-ai-selected-text label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }
      
      .compre-ai-text-display {
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 12px;
        color: #333;
        line-height: 1.5;
        word-wrap: break-word;
        max-height: 120px;
        overflow-y: auto;
      }
      
      .compre-ai-translate-section {
        margin-bottom: 20px;
        text-align: center;
      }
      
      .compre-ai-translate-btn {
        background: #007cff;
        color: white;
        border: none;
        padding: 0 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.2s;
        min-width: 100px;
        position: relative;
      }
      
      .compre-ai-translate-btn:hover:not(:disabled) {
        background: #0056cc;
      }
      
      .compre-ai-translate-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .btn-spinner {
        animation: spin 1s linear infinite;
        display: inline-block;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .compre-ai-translation-result {
        margin-bottom: 20px;
      }
      
      .compre-ai-translation-result label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }
      
      .compre-ai-result-display {
        background: #e8f5e8;
        border: 1px solid #c3e6c3;
        border-radius: 6px;
        padding: 12px;
        color: #333;
        line-height: 1.5;
        word-wrap: break-word;
        margin-bottom: 8px;
      }
      
      .compre-ai-error {
        margin-bottom: 20px;
      }
      
      .compre-ai-error-message {
        background: #ffe6e6;
        border: 1px solid #ffcccc;
        border-radius: 6px;
        padding: 12px;
        color: #d00;
        line-height: 1.5;
      }
      
      /* Ensure panel is above all other content */
      .compre-ai-side-panel * {
        box-sizing: border-box;
      }
      
      /* Handle very long text */
      .compre-ai-text-display,
      .compre-ai-result-display {
        max-height: 200px;
        overflow-y: auto;
      }
      
      /* Scrollbar styling for webkit browsers */
      .compre-ai-side-panel ::-webkit-scrollbar {
        width: 6px;
      }
      
      .compre-ai-side-panel ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      .compre-ai-side-panel ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      .compre-ai-side-panel ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;

    document.head.appendChild(style);
  }
})();