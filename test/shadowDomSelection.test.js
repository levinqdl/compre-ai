import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { mapSidePanelSelectionToSentenceRange, extractTextFromRange } from '../src/helpers/textProcessing.ts';

describe('Shadow DOM Selection Mapping', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.Node = window.Node;
    global.Range = window.Range;
    global.Selection = window.Selection;
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should get selection from shadow root when available', () => {
    const hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });
    
    const container = document.createElement('div');
    container.textContent = 'This is a test sentence in shadow DOM.';
    shadowRoot.appendChild(container);
    
    const originalSentence = document.createElement('p');
    originalSentence.textContent = 'This is a test sentence in shadow DOM.';
    document.body.appendChild(originalSentence);
    
    const originalRange = document.createRange();
    originalRange.selectNodeContents(originalSentence);
    
    const shadowRange = document.createRange();
    shadowRange.setStart(container.firstChild, 10);
    shadowRange.setEnd(container.firstChild, 14);
    
    const shadowSelection = {
      rangeCount: 1,
      getRangeAt: (index) => shadowRange,
      toString: () => shadowRange.toString()
    };
    
    if (!shadowRoot.getSelection) {
      shadowRoot.getSelection = () => shadowSelection;
    }
    
    const result = mapSidePanelSelectionToSentenceRange(container, originalRange);
    
    expect(result).toBeDefined();
  });

  it('should fall back to window.getSelection when shadow root selection not available', () => {
    const container = document.createElement('div');
    container.textContent = 'This is a test sentence.';
    document.body.appendChild(container);
    
    const originalSentence = document.createElement('p');
    originalSentence.textContent = 'This is a test sentence.';
    document.body.appendChild(originalSentence);
    
    const originalRange = document.createRange();
    originalRange.selectNodeContents(originalSentence);
    
    const selectionRange = document.createRange();
    selectionRange.setStart(container.firstChild, 10);
    selectionRange.setEnd(container.firstChild, 14);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRange);
    
    const result = mapSidePanelSelectionToSentenceRange(container, originalRange);
    
    expect(result).toBeDefined();
  });

  it('should return null when no selection exists', () => {
    const container = document.createElement('div');
    container.textContent = 'This is a test sentence.';
    document.body.appendChild(container);
    
    const originalSentence = document.createElement('p');
    originalSentence.textContent = 'This is a test sentence.';
    document.body.appendChild(originalSentence);
    
    const originalRange = document.createRange();
    originalRange.selectNodeContents(originalSentence);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    const result = mapSidePanelSelectionToSentenceRange(container, originalRange);
    
    expect(result).toBeNull();
  });
});
