import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCompleteSentence,
  expandSentenceBoundary,
  shortenSentenceBoundary,
  extractTextFromRange,
  canExpandSentenceBoundary
} from '../src/helpers/textProcessing.ts';

describe('Expand sentence in paragraph - TDD case', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should show controls and expand to whole paragraph when selecting "shrugs" inside em tag', () => {
    const p = document.createElement('p');
    p.innerHTML = `
      Like, the manual? <em>shrugs</em>
    `;
    document.body.appendChild(p);

    const emElement = p.querySelector('em');
    const textNode = emElement.firstChild;
    
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 6);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const { selectedRanges, sentenceRange } = getCompleteSentence();

    expect(selectedRanges.length).toBe(1);
    expect(extractTextFromRange(selectedRanges[0])).toBe('shrugs');
    
    expect(sentenceRange).not.toBeNull();
    const sentenceText = extractTextFromRange(sentenceRange);
    
    expect(sentenceText.trim()).toBe('shrugs');
    
    const canExpandStart = canExpandSentenceBoundary(sentenceRange, 'start');
    const canExpandEnd = canExpandSentenceBoundary(sentenceRange, 'end');
    
    expect(canExpandStart).toBe(true);
    
    const selectedTextStr = extractTextFromRange(selectedRanges[0]);
    const canExpand = canExpandStart || canExpandEnd;
    const showSentence = Boolean(
      sentenceRange && 
      sentenceText && 
      (sentenceText.trim() !== selectedTextStr.trim() || canExpand)
    );
    
    expect(showSentence).toBe(true);
    
    const expanded = expandSentenceBoundary(sentenceRange, 'start');
    expect(expanded).not.toBeNull();
    
    const expandedText = extractTextFromRange(expanded);
    expect(expandedText).toContain('Like, the manual?');
    expect(expandedText).toContain('shrugs');
  });

  it('should reverse expand operation when shortening at start', () => {
    const p = document.createElement('p');
    p.innerHTML = `
      Like, the manual? <em>shrugs</em>
    `;
    document.body.appendChild(p);

    const emElement = p.querySelector('em');
    const textNode = emElement.firstChild;
    
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 6);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const { selectedRanges, sentenceRange } = getCompleteSentence();
    const originalText = extractTextFromRange(sentenceRange);
    
    expect(originalText.trim()).toBe('shrugs');
    
    const expanded = expandSentenceBoundary(sentenceRange, 'start');
    const expandedText = extractTextFromRange(expanded);
    expect(expandedText).toContain('Like, the manual?');
    
    const shortened = shortenSentenceBoundary(expanded, 'start');
    expect(shortened).not.toBeNull();
    
    const shortenedText = extractTextFromRange(shortened);
    expect(shortenedText.trim()).toBe(originalText.trim());
  });

  it('should handle multiple expand/shorten cycles', () => {
    const p = document.createElement('p');
    p.innerHTML = `First sentence. Second sentence. <em>Third word</em>.`;
    document.body.appendChild(p);

    const emElement = p.querySelector('em');
    const textNode = emElement.firstChild;
    
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 10);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const { selectedRanges, sentenceRange } = getCompleteSentence();
    const originalText = extractTextFromRange(sentenceRange);
    expect(originalText).toContain('Third word');
    
    const expanded1 = expandSentenceBoundary(sentenceRange, 'start');
    expect(expanded1).not.toBeNull();
    let expandedText = extractTextFromRange(expanded1);
    expect(expandedText).toContain('Second sentence');
    
    const expanded2 = expandSentenceBoundary(expanded1, 'start');
    expect(expanded2).not.toBeNull();
    expandedText = extractTextFromRange(expanded2);
    expect(expandedText).toContain('First sentence');
    
    const shortened1 = shortenSentenceBoundary(expanded2, 'start');
    expect(shortened1).not.toBeNull();
    let shortenedText = extractTextFromRange(shortened1);
    expect(shortenedText).toContain('Second sentence');
    expect(shortenedText).not.toContain('First sentence');
    
    const shortened2 = shortenSentenceBoundary(shortened1, 'start');
    expect(shortened2).not.toBeNull();
    shortenedText = extractTextFromRange(shortened2);
    expect(shortenedText).toContain('Third word');
    expect(shortenedText.trim()).toBe(originalText.trim());
  });
});
