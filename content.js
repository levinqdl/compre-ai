// Content script for Compre AI Chrome Extension
// This script runs on all web pages and handles communication with the popup

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  });

  async function handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'translate-text':
          await translateSelectedText(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async function translateSelectedText(sendResponse) {
    try {
      const selectedText = getSelectedText();
      
      if (!selectedText) {
        sendResponse({ 
          success: false, 
          error: 'Please select text to translate' 
        });
        return;
      }

      // Send request to translation API
      const translationResult = await callTranslationAPI(selectedText);
      
      if (translationResult.success) {
        showTextResult('Translation', translationResult.translation);
        
        sendResponse({ 
          success: true, 
          message: 'Text translated successfully',
          data: { 
            original: selectedText, 
            translation: translationResult.translation,
            detectedLanguage: translationResult.detectedLanguage,
            targetLanguage: translationResult.targetLanguage
          }
        });
      } else {
        sendResponse({ 
          success: false, 
          error: translationResult.error || 'Translation failed'
        });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Utility functions
  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  // Translation API call function
  async function callTranslationAPI(text) {
    try {
      // Configuration for translation API
      const API_ENDPOINT = 'https://your-translation-api.com/translate';
      const API_KEY = await getApiKey(); // Get API key from storage
      const TARGET_LANGUAGE = await getTargetLanguage(); // Get target language from storage
      
      if (!API_KEY) {
        return {
          success: false,
          error: 'API key not configured. Please set up your translation API key in extension settings.'
        };
      }

      // Prepare request payload
      const requestBody = {
        text: text,
        target_language: TARGET_LANGUAGE || 'en', // Default to English
        detect_source: true // Auto-detect source language
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

      // Handle successful response
      return {
        success: true,
        translation: data.translated_text || data.translation || text,
        detectedLanguage: data.detected_language || 'unknown',
        targetLanguage: data.target_language || TARGET_LANGUAGE,
        confidence: data.confidence || null
      };

    } catch (error) {
      console.error('Translation API error:', error);
      
      // Return fallback response
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
      return result.targetLanguage || 'en'; // Default to English
    } catch (error) {
      console.error('Error getting target language:', error);
      return 'en';
    }
  }

  function showTextResult(title, content) {
    const overlay = createOverlay(title, `
      <div class="text-result">
        <p>${content}</p>
      </div>
    `);
  }

  function createOverlay(title, content) {
    // Remove any existing overlay
    const existingOverlay = document.getElementById('compre-ai-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'compre-ai-overlay';
    overlay.innerHTML = `
      <div class="compre-ai-modal">
        <div class="compre-ai-header">
          <h3>${title}</h3>
          <button class="compre-ai-close">&times;</button>
        </div>
        <div class="compre-ai-content">
          ${content}
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #compre-ai-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .compre-ai-modal {
        background: white;
        border-radius: 10px;
        max-width: 500px;
        max-height: 70vh;
        overflow: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .compre-ai-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .compre-ai-header h3 {
        margin: 0;
        color: #333;
      }
      .compre-ai-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      .compre-ai-content {
        padding: 20px;
        color: #333;
      }
      .compre-ai-content ul {
        padding-left: 20px;
      }
      .compre-ai-content li {
        margin: 5px 0;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    // Add close functionality
    overlay.querySelector('.compre-ai-close').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    return overlay;
  }
})();