/// <reference types="chrome" />
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  buildTranslationRequestPayload,
  extractTextFromRange,
  getCompleteSentence,
  highlightSelectedInSentence,
  mergeOverlappingSelections,
  expandSentenceBoundary,
  shortenSentenceBoundary
} from './helpers/textProcessing';
import { SelectionActionManager } from './helpers/selectionActionManager';
import SidePanel from './components/SidePanel';
import './styles.css';

(function() {
  'use strict';

  let sidePanelContainer: HTMLElement | null = null;
  let sidePanelRoot: Root | null = null;
  const CURRENT_HOSTNAME = window.location.hostname.toLowerCase();
  const SITE_PREF_KEY = 'enabledSites';
  let siteEnabled = false;
  let accumulatedSelectedTexts: string[] = [];
  let accumulatedSelectedRanges: Range[] = [];
  let currentSentenceRange: Range | null = null;
  let apiBaseUrl: string | null = null;
  let selectionActionManager: SelectionActionManager;

  init().catch((error) => console.error('Failed to initialize Compre AI content script', error));

  async function init() {
    await loadApiConfig();
    await refreshSitePreference();
    selectionActionManager = new SelectionActionManager(() => processSelection());
    selectionActionManager.initialize();
  chrome.storage.onChanged.addListener((changes: Record<string, any>, areaName: 'sync' | 'local' | 'managed' | 'session') => {
      if (areaName === 'sync' && Object.prototype.hasOwnProperty.call(changes, SITE_PREF_KEY)) {
        applySitePreference(changes[SITE_PREF_KEY]?.newValue || []);
      }
    });
  chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response?: any) => void) => {
      handleMessage(request, sender, sendResponse);
      return true;
    });
    console.log('Compre AI content script initialized');
  }

  async function loadApiConfig() {
    try {
      apiBaseUrl = ((globalThis as any).API_BASE_URL) || null;
      if (!apiBaseUrl) {
        const stored = await chrome.storage.local.get(['apiBaseUrl']);
        apiBaseUrl = stored.apiBaseUrl || 'https://compre-ai.icu';
      }
      await chrome.storage.local.set({ apiBaseUrl });
      console.log('API Base URL loaded:', apiBaseUrl);
    } catch (error) {
      console.error('Error loading API config', error);
      apiBaseUrl = 'https://compre-ai.icu';
    }
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

  function processSelection(): void {
    if (!siteEnabled) {
      hideSidePanel();
      accumulatedSelectedTexts = [];
      accumulatedSelectedRanges = [];
      return;
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

    const { selectedRanges, sentenceRange } = getCompleteSentence();
    if (selectedRanges && selectedRanges.length > 0) {
      if (sentenceRange && !isSameSentenceRange(currentSentenceRange, sentenceRange)) {
        accumulatedSelectedTexts = [];
        accumulatedSelectedRanges = [];
        currentSentenceRange = sentenceRange;
      }
      selectedRanges.forEach(range => {
        const text = extractTextFromRange(range);
        if (text) {
          accumulatedSelectedTexts = mergeOverlappingSelections(accumulatedSelectedTexts, text);
          accumulatedSelectedRanges.push(range.cloneRange());
        }
      });
      showSidePanel(accumulatedSelectedRanges, sentenceRange);
    } else {
      if (accumulatedSelectedTexts.length === 0) {
        hideSidePanel();
      }
    }
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

  function handleExpandSentenceStart() {
    if (!currentSentenceRange) return;
    
    const newRange = expandSentenceBoundary(currentSentenceRange, 'start');
    if (newRange) {
      currentSentenceRange = newRange;
      showSidePanel(accumulatedSelectedRanges, currentSentenceRange);
    }
  }

  function handleShortenSentenceStart() {
    if (!currentSentenceRange) return;
    
    const newRange = shortenSentenceBoundary(currentSentenceRange, 'start');
    if (newRange) {
      currentSentenceRange = newRange;
      showSidePanel(accumulatedSelectedRanges, currentSentenceRange);
    }
  }

  function handleExpandSentenceEnd() {
    if (!currentSentenceRange) return;
    
    const newRange = expandSentenceBoundary(currentSentenceRange, 'end');
    if (newRange) {
      currentSentenceRange = newRange;
      showSidePanel(accumulatedSelectedRanges, currentSentenceRange);
    }
  }

  function handleShortenSentenceEnd() {
    if (!currentSentenceRange) return;
    
    const newRange = shortenSentenceBoundary(currentSentenceRange, 'end');
    if (newRange) {
      currentSentenceRange = newRange;
      showSidePanel(accumulatedSelectedRanges, currentSentenceRange);
    }
  }

  function showSidePanel(selectedRanges: Range[], sentenceRange: Range | null) {
    if (!siteEnabled) return;
    if (!sidePanelContainer) {
      sidePanelContainer = document.createElement('div');
      sidePanelContainer.className = 'compre-ai-root';
      sidePanelContainer.id = "compre-ai-root";
      document.body.appendChild(sidePanelContainer);
      sidePanelRoot = createRoot(sidePanelContainer);
    }
    
    const selectedText = selectedRanges.map(range => extractTextFromRange(range));
    const sentenceText = sentenceRange ? extractTextFromRange(sentenceRange) : '';
    const highlightedSentence = sentenceRange ? highlightSelectedInSentence(sentenceRange, selectedRanges) : '';
    const selectedTextStr = selectedText.join(' ');
    const showSentence = Boolean(sentenceRange && sentenceText && sentenceText.trim() !== selectedTextStr.trim());
    
    sidePanelRoot?.render(
      React.createElement(SidePanel, {
        selectedText,
        sentenceText,
        highlightedSentence,
        showSentence,
        onClose: hideSidePanel,
        onTranslate: () => translateText({ selectedText, sentenceRange }),
        onExpandSentenceStart: () => handleExpandSentenceStart(),
        onShortenSentenceStart: () => handleShortenSentenceStart(),
        onExpandSentenceEnd: () => handleExpandSentenceEnd(),
        onShortenSentenceEnd: () => handleShortenSentenceEnd()
      })
    );
  }



  function hideSidePanel() {
    if (sidePanelRoot) {
      sidePanelRoot.unmount();
      sidePanelRoot = null;
    }
    if (sidePanelContainer && sidePanelContainer.parentNode) {
      sidePanelContainer.parentNode.removeChild(sidePanelContainer);
      sidePanelContainer = null;
    }
    accumulatedSelectedTexts = [];
    currentSentenceRange = null;
  }

  async function translateText({ selectedText, sentenceRange }: { selectedText: string | string[]; sentenceRange: Range | null }): Promise<{ success: boolean; translation?: string; error?: string; detectedLanguage?: string; targetLanguage?: string; model?: string; explanations?: any[]; }> {
    if (!siteEnabled) {
      return {
        success: false,
        error: 'Compre AI is disabled on this site.'
      };
    }
    
    try {
      const result = await callTranslationAPI({ selectedText, sentenceRange });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: 'Translation service error: ' + message
      };
    }
  }

  async function callTranslationAPI({ selectedText, sentenceRange }: { selectedText: string | string[]; sentenceRange: Range | null }) {
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!apiBaseUrl) {
          await loadApiConfig();
        }
        const base = apiBaseUrl || 'https://compre-ai.icu';
        const API_ENDPOINT = base.replace(/\/$/, '') + '/translate';
        const TARGET_LANGUAGE = await getTargetLanguage();
        const completeSentenceArg: string | Range = sentenceRange ?? (Array.isArray(selectedText) ? selectedText.join(' ') : selectedText);
        const requestBody = buildTranslationRequestPayload({ selectedText, completeSentence: completeSentenceArg, targetLanguage: TARGET_LANGUAGE });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Translation API error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        
        if (attempt < MAX_RETRIES) {
          const isRetryableError = error instanceof Error && (
            error.name === 'AbortError' ||
            error.message.includes('ERR_CONNECTION') ||
            error.message.includes('network') ||
            error.message.includes('fetch')
          );
          if (isRetryableError) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }
        break;
      }
    }
    
    const message = lastError?.message || 'Unknown error';
    return { success: false, error: `Translation service error: ${message}` };
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


})();
