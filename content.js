// Content script for Compre AI Chrome Extension
// This script runs on all web pages and handles text selection and side panel display

(function() {
  'use strict';

  let isSelecting = false;
  let sidePanel = null;
  let selectionTimeout = null;
  const CURRENT_HOSTNAME = window.location.hostname.toLowerCase();
  const SITE_PREF_KEY = 'disabledSites';
  let siteEnabled = true;

  // Helper functions loaded dynamically to reuse tested module code
  let extractSentenceContaining;
  let highlightSelectedInSentence;
  let escapeHtml;
  let buildTranslationRequestPayload;

  // Bootstrap: load helper module then init
  (async () => {
    try {
      const helpers = await import(chrome.runtime.getURL('src/helpers/textProcessing.js'));
      ({ extractSentenceContaining, highlightSelectedInSentence, escapeHtml, buildTranslationRequestPayload } = helpers);
    } catch (e) {
      console.error('Failed to load textProcessing helpers, falling back to inline implementations', e);
      // Fallback minimal implementations (only if import fails)
      escapeHtml = (unsafe) => unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      extractSentenceContaining = (fullText, selectedText) => selectedText || '';
      highlightSelectedInSentence = (sentence, selectedText) => escapeHtml(sentence || '');
      buildTranslationRequestPayload = ({ selectedText, completeSentence, targetLanguage }) => {
        const selection = (selectedText || '').trim();
        const sentence = (completeSentence || '').trim();
        const text = sentence || selection;
        return {
          text,
          completeSentence: sentence || text,
          to: targetLanguage || 'zh',
          detect_source: true
        };
      };
    }
    init().catch((error) => console.error('Failed to initialize Compre AI content script', error));
  })();

  async function init() {
    await refreshSitePreference();

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && Object.prototype.hasOwnProperty.call(changes, SITE_PREF_KEY)) {
        applySitePreference(changes[SITE_PREF_KEY]?.newValue || []);
      }
    });

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

  async function refreshSitePreference() {
    try {
      const stored = await chrome.storage.sync.get([SITE_PREF_KEY]);
      applySitePreference(stored[SITE_PREF_KEY] || []);
    } catch (error) {
      console.error('Error loading site preference', error);
      siteEnabled = true;
    }
  }

  function applySitePreference(list) {
    const normalized = Array.isArray(list)
      ? list.map((item) => (item || '').toString().toLowerCase().trim()).filter(Boolean)
      : [];
    siteEnabled = !normalized.includes(CURRENT_HOSTNAME);
    if (!siteEnabled) {
      hideSidePanel();
    }
  }

  // Debounced selection change handler
  function debounceSelectionChange() {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }

    if (!siteEnabled) {
      hideSidePanel();
      return;
    }
    
    selectionTimeout = setTimeout(() => {
      if (!siteEnabled) {
        hideSidePanel();
        return;
      }
      const { selectedText, completeSentence } = getCompleteSentence();
      if (selectedText && selectedText.length > 0) {
        showSidePanel(selectedText, completeSentence);
      } else {
        hideSidePanel();
      }
    }, 300);
  }

  function getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  function getCompleteSentence() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim() === '') {
      return { selectedText: '', completeSentence: '' };
    }

    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    
    // Get the text content of the container element
    let container = range.commonAncestorContainer;
    
    // If it's a text node, get its parent element
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }
    
    // Find the closest block-level element or paragraph
    while (container && !isBlockElement(container) && container.parentElement) {
      container = container.parentElement;
    }
    
    if (!container) {
      return { selectedText, completeSentence: selectedText };
    }
    
    // Get all text content from the container
    const fullText = container.textContent || container.innerText || '';
    
    // Find the sentence boundaries around the selected text
    const completeSentence = extractSentenceContaining(fullText, selectedText);
    
    return { selectedText, completeSentence };
  }

  function isBlockElement(element) {
    if (!element || !element.tagName) return false;
    
    const blockElements = [
      'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
      'BLOCKQUOTE', 'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 
      'ASIDE', 'NAV', 'MAIN', 'HEADER', 'FOOTER'
    ];
    
    return blockElements.includes(element.tagName.toUpperCase());
  }

  // extractSentenceContaining now provided by helpers

  function showSidePanel(selectedText, completeSentence) {
    if (!siteEnabled) return;
    if (sidePanel) {
      // Panel already exists, just update the selected text
      updateSelectedText(selectedText, completeSentence);
    } else {
      // Create new panel
      sidePanel = createSidePanel(selectedText, completeSentence);
      document.body.appendChild(sidePanel);
      
      // Animate in
      setTimeout(() => {
        sidePanel.classList.add('compre-ai-panel-visible');
      }, 10);
    }
  }

  function updateSelectedText(selectedText, completeSentence) {
    if (!sidePanel) return;
    
    const selectedTextDisplay = sidePanel.querySelector('.compre-ai-selected-display');
    const sentenceDisplay = sidePanel.querySelector('.compre-ai-sentence-display');
    const translateBtn = sidePanel.querySelector('.compre-ai-translate-btn');
    const resultDiv = sidePanel.querySelector('#translation-result');
    const errorDiv = sidePanel.querySelector('#error-display');
    const languageInfo = sidePanel.querySelector('.compre-ai-language-info');
    const explanationSection = sidePanel.querySelector('#translation-explanation');
    const explanationDisplay = sidePanel.querySelector('.compre-ai-explanation-display');
    const modelInfo = sidePanel.querySelector('.compre-ai-model-info');
    
    // Update the displayed text
    if (selectedTextDisplay) {
      selectedTextDisplay.innerHTML = escapeHtml(selectedText);
    }
    
    // Update the complete sentence with highlighted selection
    if (sentenceDisplay && completeSentence) {
      const highlightedSentence = highlightSelectedInSentence(completeSentence, selectedText);
      sentenceDisplay.innerHTML = highlightedSentence;
    }
    
    // Hide previous translation results/errors since text changed
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    if (languageInfo) {
      languageInfo.textContent = '';
      languageInfo.style.display = 'none';
    }
    if (explanationSection && explanationDisplay) {
      explanationSection.style.display = 'none';
      explanationDisplay.textContent = '';
    }
    if (modelInfo) {
      modelInfo.textContent = '';
      modelInfo.style.display = 'none';
    }
    
    // Reset translate button state and update its click handler
    translateBtn.disabled = false;
    const btnText = translateBtn.querySelector('.btn-text');
    const btnSpinner = translateBtn.querySelector('.btn-spinner');
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    
    // Remove old event listener and add new one with updated text
  const newTranslateBtn = translateBtn.cloneNode(true);
  translateBtn.parentNode.replaceChild(newTranslateBtn, translateBtn);
  newTranslateBtn.addEventListener('click', () => translateText({ selectedText, completeSentence }, sidePanel));
  }

  // highlightSelectedInSentence now provided by helpers

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

  function createSidePanel(selectedText, completeSentence) {
    const panel = document.createElement('div');
    panel.className = 'compre-ai-side-panel';
    
    // Create highlighted sentence if available
    const highlightedSentence = completeSentence ? highlightSelectedInSentence(completeSentence, selectedText) : '';
    const showSentence = completeSentence && completeSentence !== selectedText;
    
    panel.innerHTML = `
      <div class="compre-ai-panel-header">
        <h3>Compre AI Translator</h3>
        <button class="compre-ai-close-btn" title="Close">&times;</button>
      </div>
      
      <div class="compre-ai-panel-content">
        ${showSentence ? `
        <div class="compre-ai-complete-sentence">
          <label>Complete Sentence:</label>
          <div class="compre-ai-sentence-display">${highlightedSentence}</div>
        </div>
        ` : ''}
        
        <div class="compre-ai-selected-text">
          <label>Selected Text:</label>
          <div class="compre-ai-selected-display">${escapeHtml(selectedText)}</div>
        </div>
        
        <div class="compre-ai-translate-section">
          <button class="compre-ai-translate-btn" id="translate-btn">
            <span class="btn-text">Translate ${showSentence ? 'Sentence' : 'Text'}</span>
            <span class="btn-spinner" style="display: none;">⟳</span>
          </button>
        </div>
        
        <div class="compre-ai-translation-result" id="translation-result" style="display: none;">
          <label>Translation:</label>
          <div class="compre-ai-result-display"></div>
          <div class="compre-ai-language-info" style="display: none;"></div>
          <div class="compre-ai-explanation" id="translation-explanation" style="display: none;">
            <label>Explanation:</label>
            <div class="compre-ai-explanation-display"></div>
          </div>
          <div class="compre-ai-model-info" style="display: none;"></div>
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
    translateBtn.addEventListener('click', () => translateText({ selectedText, completeSentence }, panel));

    // Add styles if not already added
    addStyles();
    
    return panel;
  }

  async function translateText({ selectedText, completeSentence }, panel) {
    const translateBtn = panel.querySelector('.compre-ai-translate-btn');
    const btnText = translateBtn.querySelector('.btn-text');
    const btnSpinner = translateBtn.querySelector('.btn-spinner');
    const resultDiv = panel.querySelector('#translation-result');
    const errorDiv = panel.querySelector('#error-display');
    const errorMessage = panel.querySelector('.compre-ai-error-message');
    const languageInfo = panel.querySelector('.compre-ai-language-info');
    const explanationSection = panel.querySelector('#translation-explanation');
    const explanationDisplay = panel.querySelector('.compre-ai-explanation-display');
    const modelInfo = panel.querySelector('.compre-ai-model-info');
    
    if (!siteEnabled) {
      resultDiv.style.display = 'none';
      errorDiv.style.display = 'block';
      errorMessage.textContent = 'Compre AI is disabled on this site.';
      translateBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      return;
    }

    // Show loading state
    translateBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    // Hide previous results/errors
    resultDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    if (languageInfo) {
      languageInfo.textContent = '';
      languageInfo.style.display = 'none';
    }
    if (explanationSection && explanationDisplay) {
      explanationSection.style.display = 'none';
      explanationDisplay.textContent = '';
    }
    if (modelInfo) {
      modelInfo.textContent = '';
      modelInfo.style.display = 'none';
    }
    
    try {
      const result = await callTranslationAPI({ selectedText, completeSentence });
      
      if (result.success) {
        // Show translation result
        const resultDisplay = panel.querySelector('.compre-ai-result-display');
        
        resultDisplay.textContent = result.translation;
        if (languageInfo) {
          const parts = [];
          if (result.detectedLanguage && result.detectedLanguage.toLowerCase() !== 'unknown') {
            parts.push(`Detected: ${result.detectedLanguage}`);
          }
          const targetLang = result.targetLanguage || result.to;
          if (targetLang) {
            parts.push(`Target: ${targetLang}`);
          }
          if (parts.length > 0) {
            languageInfo.textContent = parts.join(' • ');
            languageInfo.style.display = 'block';
          }
        }
        if (explanationSection && explanationDisplay && result.explanation) {
          explanationDisplay.textContent = result.explanation;
          explanationSection.style.display = 'block';
        }
        if (modelInfo && result.model) {
          modelInfo.textContent = `Model: ${result.model}`;
          modelInfo.style.display = 'block';
        }
        
        resultDiv.style.display = 'block';
      } else {
        // Show error
        const errorMessage = panel.querySelector('.compre-ai-error-message');
        errorMessage.textContent = result.error || 'Translation failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      // Show error
      errorMessage.textContent = 'Translation service error: ' + error.message;
      errorDiv.style.display = 'block';
    }
    
    // Reset button state
    translateBtn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }

  // Translation API call function
  async function callTranslationAPI({ selectedText, completeSentence }) {
    try {
      // Determine API endpoint
      const base = (typeof globalThis !== 'undefined' && globalThis.API_BASE_URL) || 'https://your-translation-api.com';
      const API_ENDPOINT = base.replace(/\/$/, '') + '/translate';
      const TARGET_LANGUAGE = await getTargetLanguage();

      // Prepare request payload
      const requestBody = buildTranslationRequestPayload({
        selectedText,
        completeSentence,
        targetLanguage: TARGET_LANGUAGE
      });

      // Make API request with cookies for authentication
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const translation = data.translation ?? data.translated_text ?? requestBody.text;
      const targetLanguage = data.targetLanguage ?? data.target_language ?? requestBody.to ?? TARGET_LANGUAGE;
      const detectedLanguage = data.detectedLanguage ?? data.detected_language ?? data.source_language ?? null;
      const explanation = data.explanation ?? data.explanation_text ?? null;
      const model = data.model ?? data.translation_model ?? null;

      return {
        success: true,
        translation,
        explanation,
        targetLanguage,
        detectedLanguage,
        model,
        to: targetLanguage,
        confidence: data.confidence ?? null
      };

    } catch (error) {
      console.error('Translation API error:', error);
      return {
        success: false,
        error: `Translation service error: ${error.message}`
      };
    }
  }

  // Get target language (hard-coded to Chinese)
  async function getTargetLanguage() {
    return 'zh';
  }

  // Handle messages from popup/background
  async function handleMessage(request, sender, sendResponse) {
    try {
      if (!siteEnabled) {
        sendResponse({ success: false, error: 'Compre AI is disabled on this site.' });
        return;
      }
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

  // escapeHtml now provided by helpers

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
      
      .compre-ai-complete-sentence {
        margin-bottom: 20px;
      }
      
      .compre-ai-complete-sentence label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }
      
      .compre-ai-sentence-display {
        background: #f0f8ff;
        border: 1px solid #b8d4f0;
        border-radius: 6px;
        padding: 12px;
        color: #333;
        line-height: 1.6;
        word-wrap: break-word;
        max-height: 150px;
        overflow-y: auto;
      }
      
      .compre-ai-sentence-display mark {
        background-color: #fff3cd !important;
        padding: 1px 2px !important;
        border-radius: 2px !important;
        font-weight: 600;
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
      
      .compre-ai-selected-display {
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

      .compre-ai-language-info {
        font-size: 12px;
        color: #555;
        margin-bottom: 10px;
      }

      .compre-ai-explanation {
        margin-top: 12px;
      }

      .compre-ai-explanation label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #333;
      }

      .compre-ai-explanation-display {
        background: #fefae8;
        border: 1px solid #f0d98c;
        border-radius: 6px;
        padding: 12px;
        color: #333;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .compre-ai-model-info {
        margin-top: 10px;
        font-size: 12px;
        color: #555;
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
      .compre-ai-selected-display,
      .compre-ai-sentence-display,
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