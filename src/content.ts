/// <reference types="chrome" />
import {
  buildTranslationRequestPayload,
  escapeHtml,
  extractTextFromRange,
  getCompleteSentence,
  highlightSelectedInSentence,
  mergeOverlappingSelections
} from './helpers/textProcessing';

// Content script for Compre AI Chrome Extension
// This script runs on all web pages and handles text selection and side panel display

(function() {
  'use strict';

  let isSelecting = false;
  let sidePanel: HTMLElement | null = null;
  let selectionTimeout: ReturnType<typeof setTimeout> | null = null;
  const CURRENT_HOSTNAME = window.location.hostname.toLowerCase();
  const SITE_PREF_KEY = 'enabledSites';
  let siteEnabled = false;
  let accumulatedSelectedTexts: string[] = [];
  let currentSentenceRange: Range | null = null;

  init().catch((error) => console.error('Failed to initialize Compre AI content script', error));

  async function init() {
    await refreshSitePreference();
  chrome.storage.onChanged.addListener((changes: Record<string, any>, areaName: 'sync' | 'local' | 'managed' | 'session') => {
      if (areaName === 'sync' && Object.prototype.hasOwnProperty.call(changes, SITE_PREF_KEY)) {
        applySitePreference(changes[SITE_PREF_KEY]?.newValue || []);
      }
    });
    document.addEventListener('selectionchange', debounceSelectionChange);
  chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response?: any) => void) => {
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
      siteEnabled = false;
    }
  }

  function applySitePreference(list: unknown) {
    const normalized = Array.isArray(list)
      ? list.map((item) => (item || '').toString().toLowerCase().trim()).filter(Boolean)
      : [];
    siteEnabled = normalized.includes(CURRENT_HOSTNAME);
    if (!siteEnabled) {
      hideSidePanel();
    }
  }

  function debounceSelectionChange(): void {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }
  const sidePanelElem = document.querySelector('.compre-ai-side-panel') as HTMLElement | null;
  const selection = window.getSelection();
    if (sidePanelElem && selection && selection.rangeCount > 0) {
      for (let i = 0; i < selection.rangeCount; i++) {
        const range = selection.getRangeAt(i);
        if (sidePanelElem.contains(range.startContainer) || sidePanelElem.contains(range.endContainer)) {
          return;
        }
      }
    }
    if (!siteEnabled) {
      hideSidePanel();
      accumulatedSelectedTexts = [];
      return;
    }
  selectionTimeout = setTimeout(() => {
      if (!siteEnabled) {
        hideSidePanel();
        accumulatedSelectedTexts = [];
        currentSentenceRange = null;
        return;
      }
      const { selectedRanges, sentenceRange } = getCompleteSentence();
      if (selectedRanges && selectedRanges.length > 0) {
        if (sentenceRange && !isSameSentenceRange(currentSentenceRange, sentenceRange)) {
          accumulatedSelectedTexts = [];
          currentSentenceRange = sentenceRange;
        }
        selectedRanges.forEach(range => {
          const text = extractTextFromRange(range);
          if (text) {
            accumulatedSelectedTexts = mergeOverlappingSelections(accumulatedSelectedTexts, text);
          }
        });
        showSidePanel(accumulatedSelectedTexts, sentenceRange);
      } else {
        if (accumulatedSelectedTexts.length === 0) {
          hideSidePanel();
        }
      }
    }, 300);
  }

  function getSelectedText(): string {
    const selection = window.getSelection();
    return selection?.toString().trim() || '';
  }

  function isSameSentenceRange(range1: Range | null, range2: Range | null) {
    if (!range1 || !range2) return false;
    try {
      return range1.compareBoundaryPoints(Range.START_TO_START, range2) === 0 &&
             range1.compareBoundaryPoints(Range.END_TO_END, range2) === 0;
    } catch (e) {
      return false;
    }
  }

  function showSidePanel(selectedText: string | string[], sentenceRange: Range | null) {
    if (!siteEnabled) return;
    if (sidePanel) {
      updateSelectedText(selectedText, sentenceRange);
    } else {
  sidePanel = createSidePanel(selectedText, sentenceRange);
  document.body.appendChild(sidePanel);
  const panelRef = sidePanel;
  setTimeout(() => { panelRef?.classList.add('compre-ai-panel-visible'); }, 10);
    }
  }

  function updateSelectedText(selectedText: string | string[], sentenceRange: Range | null) {
    if (!sidePanel) return;
  const selectedTextDisplay = sidePanel.querySelector<HTMLElement>('.compre-ai-selected-display');
  const sentenceDisplay = sidePanel.querySelector<HTMLElement>('.compre-ai-sentence-display');
  const sentenceContainer = sidePanel.querySelector<HTMLElement>('.compre-ai-complete-sentence');
  const translateBtn = sidePanel.querySelector<HTMLButtonElement>('.compre-ai-translate-btn')!;
  const resultDiv = sidePanel.querySelector<HTMLElement>('#translation-result')!;
  const errorDiv = sidePanel.querySelector<HTMLElement>('#error-display')!;
  const languageInfo = sidePanel.querySelector<HTMLElement>('.compre-ai-language-info');
  const explanationSection = sidePanel.querySelector<HTMLElement>('#translation-explanation');
  const explanationDisplay = sidePanel.querySelector<HTMLElement>('.compre-ai-explanation-display');
  const modelInfo = sidePanel.querySelector<HTMLElement>('.compre-ai-model-info');
    if (selectedTextDisplay) {
      const displayText = Array.isArray(selectedText) 
        ? selectedText.map(t => escapeHtml(t)).join(' • ')
        : escapeHtml(selectedText);
      selectedTextDisplay.innerHTML = displayText;
    }
    if (sentenceRange) {
      const sentenceText = extractTextFromRange(sentenceRange);
      const selectedTextStr = Array.isArray(selectedText) ? selectedText.join(' ') : selectedText;
      const showSentence = sentenceText && sentenceText.trim() !== selectedTextStr.trim();
      if (sentenceContainer) {
        sentenceContainer.style.display = showSentence ? 'block' : 'none';
      }
      if (sentenceDisplay && showSentence) {
        const highlightedSentence = highlightSelectedInSentence(sentenceRange, selectedText);
        sentenceDisplay.innerHTML = highlightedSentence;
      }
  const btnText = translateBtn.querySelector<HTMLElement>('.btn-text');
      if (btnText) {
        btnText.textContent = `Translate ${showSentence ? 'Sentence' : 'Text'}`;
      }
    } else if (sentenceContainer) {
      sentenceContainer.style.display = 'none';
    }
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
    translateBtn.disabled = false;
  const btnSpinner = translateBtn.querySelector<HTMLElement>('.btn-spinner');
  const btnTextElem = translateBtn.querySelector<HTMLElement>('.btn-text');
    if (btnTextElem) btnTextElem.style.display = 'inline';
    if (btnSpinner) btnSpinner.style.display = 'none';
    const newTranslateBtn = translateBtn.cloneNode(true) as HTMLButtonElement;
    translateBtn.parentNode!.replaceChild(newTranslateBtn, translateBtn);
    newTranslateBtn.addEventListener('click', () => translateText({ selectedText, sentenceRange }, sidePanel!));
  }

  function hideSidePanel() {
    if (sidePanel) {
      sidePanel.classList.remove('compre-ai-panel-visible');
      setTimeout(() => {
        if (sidePanel && sidePanel.parentNode) sidePanel.parentNode.removeChild(sidePanel);
        sidePanel = null;
        accumulatedSelectedTexts = [];
        currentSentenceRange = null;
      }, 300);
    }
  }

  function createSidePanel(selectedText: string | string[], sentenceRange: Range | null) {
    const panel = document.createElement('div');
    panel.className = 'compre-ai-side-panel';
    const highlightedSentence = sentenceRange ? highlightSelectedInSentence(sentenceRange, selectedText) : '';
    const sentenceText = sentenceRange ? extractTextFromRange(sentenceRange) : '';
    const selectedTextStr = Array.isArray(selectedText) ? selectedText.join(' ') : selectedText;
    const showSentence = sentenceRange && sentenceText && sentenceText.trim() !== selectedTextStr.trim();
    const displayText = Array.isArray(selectedText) 
      ? selectedText.map(t => escapeHtml(t)).join(' • ')
      : escapeHtml(selectedText);
    panel.innerHTML = `
      <div class="compre-ai-panel-header">
        <h3>Compre AI Translator</h3>
        <button class="compre-ai-close-btn" title="Close">&times;</button>
      </div>
      
      <div class="compre-ai-panel-content">
        <div class="compre-ai-complete-sentence" style="display: ${showSentence ? 'block' : 'none'};">
          <label>Complete Sentence:</label>
          <div class="compre-ai-sentence-display">${highlightedSentence}</div>
        </div>
        
        <div class="compre-ai-selected-text">
          <label>Selected Text:</label>
          <div class="compre-ai-selected-display">${displayText}</div>
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
            <label>Explanations:</label>
            <div class="compre-ai-explanation-display"></div>
          </div>
          <div class="compre-ai-model-info" style="display: none;"></div>
        </div>
        
        <div class="compre-ai-error" id="error-display" style="display: none;">
          <div class="compre-ai-error-message"></div>
        </div>
      </div>
    `;
  const closeBtn = panel.querySelector<HTMLButtonElement>('.compre-ai-close-btn')!;
  closeBtn.addEventListener('click', hideSidePanel);
  const translateBtn = panel.querySelector<HTMLButtonElement>('.compre-ai-translate-btn')!;
  translateBtn.addEventListener('click', () => translateText({ selectedText, sentenceRange }, panel));
    addStyles();
    return panel;
  }

  async function translateText({ selectedText, sentenceRange }: { selectedText: string | string[]; sentenceRange: Range | null }, panel: HTMLElement) {
  const translateBtn = panel.querySelector<HTMLButtonElement>('.compre-ai-translate-btn')!;
  const btnText = translateBtn.querySelector<HTMLElement>('.btn-text')!;
  const btnSpinner = translateBtn.querySelector<HTMLElement>('.btn-spinner')!;
  const resultDiv = panel.querySelector<HTMLElement>('#translation-result')!;
  const errorDiv = panel.querySelector<HTMLElement>('#error-display')!;
  const errorMessage = panel.querySelector<HTMLElement>('.compre-ai-error-message')!;
  const languageInfo = panel.querySelector<HTMLElement>('.compre-ai-language-info');
  const explanationSection = panel.querySelector<HTMLElement>('#translation-explanation');
  const explanationDisplay = panel.querySelector<HTMLElement>('.compre-ai-explanation-display');
  const modelInfo = panel.querySelector<HTMLElement>('.compre-ai-model-info');
    if (!siteEnabled) {
      resultDiv.style.display = 'none';
      errorDiv.style.display = 'block';
      errorMessage.textContent = 'Compre AI is disabled on this site.';
      translateBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      return;
    }
    translateBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
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
      const result = await callTranslationAPI({ selectedText, sentenceRange });
      if (result.success) {
  const resultDisplay = panel.querySelector<HTMLElement>('.compre-ai-result-display')!;
        resultDisplay.textContent = result.translation;
        if (languageInfo) {
          const parts = [];
          if (result.detectedLanguage && result.detectedLanguage.toLowerCase() !== 'unknown') parts.push(`Detected: ${result.detectedLanguage}`);
          const targetLang = result.targetLanguage || result.to;
          if (targetLang) parts.push(`Target: ${targetLang}`);
          if (parts.length > 0) {
            languageInfo.textContent = parts.join(' • ');
            languageInfo.style.display = 'block';
          }
        }
        if (explanationSection && explanationDisplay && result.explanations && result.explanations.length > 0) {
          explanationDisplay.innerHTML = '';
          result.explanations.forEach((item: any, index: number) => {
            const explanationItem = document.createElement('div');
            explanationItem.style.cssText = 'margin-bottom: 12px; padding-bottom: 12px;' + 
              (index < result.explanations.length - 1 ? 'border-bottom: 1px solid rgba(0,0,0,0.1);' : '');
            if (item.text) {
              const textLabel = document.createElement('div');
              textLabel.style.cssText = 'font-weight: 600; margin-bottom: 4px; color: #667eea;';
              textLabel.textContent = `"${item.text}"`;
              explanationItem.appendChild(textLabel);
            }
            if (item.explanation) {
              const explanationText = document.createElement('div');
              explanationText.style.cssText = 'color: #555; line-height: 1.5;';
              explanationText.textContent = item.explanation;
              explanationItem.appendChild(explanationText);
            }
            explanationDisplay.appendChild(explanationItem);
          });
          explanationSection.style.display = 'block';
        }
        if (modelInfo && result.model) {
          modelInfo.textContent = `Model: ${result.model}`;
          modelInfo.style.display = 'block';
        }
        resultDiv.style.display = 'block';
      } else {
        errorMessage.textContent = result.error || 'Translation failed';
        errorDiv.style.display = 'block';
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = 'Translation service error: ' + message;
      errorDiv.style.display = 'block';
    }
    translateBtn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }

  async function callTranslationAPI({ selectedText, sentenceRange }: { selectedText: string | string[]; sentenceRange: Range | null }) {
    try {
      const base = ((globalThis as any).API_BASE_URL) || 'https://your-translation-api.com';
      const API_ENDPOINT = base.replace(/\/$/, '') + '/translate';
      const TARGET_LANGUAGE = await getTargetLanguage();
  const completeSentenceArg: string | Range = sentenceRange ?? (Array.isArray(selectedText) ? selectedText.join(' ') : selectedText);
  const requestBody = buildTranslationRequestPayload({ selectedText, completeSentence: completeSentenceArg, targetLanguage: TARGET_LANGUAGE });
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const translation = data.translation ?? data.translated_text ?? requestBody.completeSentence;
      const targetLanguage = data.targetLanguage ?? data.target_language ?? requestBody.to ?? TARGET_LANGUAGE;
      const detectedLanguage = data.detectedLanguage ?? data.detected_language ?? data.source_language ?? null;
      const model = data.model ?? data.translation_model ?? null;
      let explanations = [];
      if (data.explanations && Array.isArray(data.explanations)) {
        explanations = data.explanations;
      } else if (data.explanation) {
        explanations = [{ text: requestBody.text[0] || '', explanation: data.explanation }];
      } else if (data.explanation_text) {
        explanations = [{ text: requestBody.text[0] || '', explanation: data.explanation_text }];
      }
      return { success: true, translation, explanations, targetLanguage, detectedLanguage, model, to: targetLanguage, confidence: data.confidence ?? null };
    } catch (error: unknown) {
      console.error('Translation API error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Translation service error: ${message}` };
    }
  }

  async function getTargetLanguage(): Promise<string> {
    return 'zh';
  }

  async function handleMessage(request: any, sender: any, sendResponse: (response?: any) => void) {
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
    } catch (error: unknown) {
      console.error('Content script error:', error);
      const message = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: message });
    }
  }

  function addStyles() {
    if (document.getElementById('compre-ai-styles')) return;
    const style = document.createElement('style');
    style.id = 'compre-ai-styles';
    style.textContent = `
      .compre-ai-side-panel { position: fixed; top: 0; right: -400px; width: 380px; height: 100vh; background: #ffffff; border-left: 2px solid #e0e0e0; box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1); z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: right 0.3s ease-in-out; overflow-y: auto; font-size: 14px; }
      .compre-ai-panel-visible { right: 0 !important; }
      .compre-ai-panel-header { padding: 20px; border-bottom: 1px solid #e0e0e0; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
      .compre-ai-panel-header h3 { margin: 0; color: #333; font-size: 16px; font-weight: 600; }
      .compre-ai-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
      .compre-ai-close-btn:hover { background: #e0e0e0; }
      .compre-ai-panel-content { padding: 20px; }
      .compre-ai-complete-sentence { margin-bottom: 20px; }
      .compre-ai-complete-sentence label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
      .compre-ai-sentence-display { background: #f0f8ff; border: 1px solid #b8d4f0; border-radius: 6px; padding: 12px; color: #333; line-height: 1.6; word-wrap: break-word; max-height: 150px; overflow-y: auto; }
      .compre-ai-sentence-display mark { background-color: #fff3cd !important; padding: 1px 2px !important; border-radius: 2px !important; font-weight: 600; }
      .compre-ai-selected-text { margin-bottom: 20px; }
      .compre-ai-selected-text label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
      .compre-ai-selected-display { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 12px; color: #333; line-height: 1.5; word-wrap: break-word; max-height: 120px; overflow-y: auto; }
      .compre-ai-translate-section { margin-bottom: 20px; text-align: center; }
      .compre-ai-translate-btn { background: #007cff; color: white; border: none; padding: 0 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s; min-width: 100px; position: relative; }
      .compre-ai-translate-btn:hover:not(:disabled) { background: #0056cc; }
      .compre-ai-translate-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .btn-spinner { animation: spin 1s linear infinite; display: inline-block; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .compre-ai-translation-result { margin-bottom: 20px; }
      .compre-ai-translation-result label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
      .compre-ai-result-display { background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 6px; padding: 12px; color: #333; line-height: 1.5; word-wrap: break-word; margin-bottom: 8px; }
      .compre-ai-language-info { font-size: 12px; color: #555; margin-bottom: 10px; }
      .compre-ai-explanation { margin-top: 12px; }
      .compre-ai-explanation label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; }
      .compre-ai-explanation-display { background: #fefae8; border: 1px solid #f0d98c; border-radius: 6px; padding: 12px; color: #333; line-height: 1.5; word-wrap: break-word; }
      .compre-ai-model-info { margin-top: 10px; font-size: 12px; color: #555; }
      .compre-ai-error { margin-bottom: 20px; }
      .compre-ai-error-message { background: #ffe6e6; border: 1px solid #ffcccc; border-radius: 6px; padding: 12px; color: #d00; line-height: 1.5; }
      .compre-ai-side-panel * { box-sizing: border-box; }
      .compre-ai-selected-display, .compre-ai-sentence-display, .compre-ai-result-display { max-height: 200px; overflow-y: auto; }
      .compre-ai-side-panel ::-webkit-scrollbar { width: 6px; }
      .compre-ai-side-panel ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
      .compre-ai-side-panel ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
      .compre-ai-side-panel ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
    `;
    document.head.appendChild(style);
  }
})();
