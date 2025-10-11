import { describe, it, expect, beforeEach } from 'vitest';
import { extractSentenceContaining, escapeHtml, highlightSelectedInSentence, buildTranslationRequestPayload, findSentenceRangeContaining, extractTextFromRange, createRangeFromOffsets, mergeOverlappingSelections } from '../src/helpers/textProcessing.ts';

describe('extractSentenceContaining', () => {
  it('returns the full sentence containing the selection', () => {
    const text = 'Hello world! This is a test. Another sentence? Final one.';
    const selected = 'a test';
    const result = extractSentenceContaining(text, selected);
    expect(result).toBe('This is a test.');
  });

  it('falls back to selected text when not found', () => {
    const text = 'One sentence here.';
    const selected = 'missing';
    expect(extractSentenceContaining(text, selected)).toBe(selected);
  });

  it('returns all sentences overlapped by the selection span', () => {
    const text = 'AI is evolving fast. It bridges gaps between industries. Collaboration improves.';
    const selected = 'fast. It bridges gaps between';
    const result = extractSentenceContaining(text, selected);
    expect(result).toBe('AI is evolving fast. It bridges gaps between industries.');
  });

  it('handles numbers with periods correctly', () => {
    const text = 'I returned to copilot right as 4.5 came out so maybe I\'m just witness Claude carry';
    const selected = 'witness Claude carry';
    const result = extractSentenceContaining(text, selected);
    expect(result).toBe('I returned to copilot right as 4.5 came out so maybe I\'m just witness Claude carry');
  });
});

describe('escapeHtml', () => {
  it('escapes special HTML characters', () => {
    const unsafe = '<div class="x">&"\'</div>';
    const escaped = escapeHtml(unsafe);
    expect(escaped).toBe('&lt;div class=&quot;x&quot;&gt;&amp;&quot;&#039;&lt;/div&gt;');
  });
});

describe('highlightSelectedInSentence', () => {
  it('wraps selection with mark tags', () => {
    const sentence = 'This is a simple test sentence.';
    const selection = 'simple test';
    const result = highlightSelectedInSentence(sentence, selection);
    expect(result).toContain('<mark');
    expect(result).toMatch(/<mark[^>]*>simple test<\/mark>/i);
  });

  it('is case-insensitive', () => {
    const sentence = 'Case Insensitive Match';
    const selection = 'case insensitive';
    const result = highlightSelectedInSentence(sentence, selection);
    expect(result.toLowerCase()).toContain('<mark');
  });
});

describe('buildTranslationRequestPayload', () => {
  it('uses complete sentence when provided', () => {
    const payload = buildTranslationRequestPayload({
      selectedText: 'hello',
      completeSentence: 'hello world',
      targetLanguage: 'pt'
    });
    expect(payload.text).toEqual(['hello']);
    expect(payload.completeSentence).toBe('hello world');
    expect(payload.to).toBe('pt');
    expect(payload.detect_source).toBe(true);
  });

  it('falls back to selection when sentence is empty', () => {
    const payload = buildTranslationRequestPayload({
      selectedText: 'bonjour',
      completeSentence: '',
      targetLanguage: null
    });
    expect(payload.text).toEqual(['bonjour']);
    expect(payload.completeSentence).toBe('bonjour');
    expect(payload.to).toBe('zh');
  });

  it('handles array of selected texts', () => {
    const payload = buildTranslationRequestPayload({
      selectedText: ['hello', 'world'],
      completeSentence: 'hello beautiful world',
      targetLanguage: 'es'
    });
    expect(payload.text).toEqual(['hello', 'world']);
    expect(payload.completeSentence).toBe('hello beautiful world');
    expect(payload.to).toBe('es');
  });

  it('handles Range objects for selectedText', () => {
    const mockRange = {
      toString: () => 'range text'
    };
    const payload = buildTranslationRequestPayload({
      selectedText: [mockRange],
      completeSentence: 'complete range text here',
      targetLanguage: 'fr'
    });
    expect(payload.text).toEqual(['range text']);
    expect(payload.completeSentence).toBe('complete range text here');
  });

  it('handles Range object for completeSentence', () => {
    const mockRange = {
      toString: () => 'sentence from range'
    };
    const payload = buildTranslationRequestPayload({
      selectedText: 'selected',
      completeSentence: mockRange,
      targetLanguage: 'de'
    });
    expect(payload.text).toEqual(['selected']);
    expect(payload.completeSentence).toBe('sentence from range');
  });
});

describe('findSentenceRangeContaining', () => {
  let textNode;

  beforeEach(() => {
    textNode = document.createTextNode('First sentence. Second sentence! Third sentence?');
  });

  it('returns range for single sentence', () => {
    const result = findSentenceRangeContaining(textNode, 6, 14);
    expect(result).toEqual({ startOffset: 0, endOffset: 16 });
  });

  it('returns range spanning multiple sentences', () => {
    const result = findSentenceRangeContaining(textNode, 10, 25);
    expect(result).toEqual({ startOffset: 0, endOffset: 33 });
  });

  it('returns null for non-text nodes', () => {
    const element = document.createElement('div');
    const result = findSentenceRangeContaining(element, 0, 5);
    expect(result).toBeNull();
  });

  it('returns original offsets when no sentence boundaries found', () => {
    const simpleNode = document.createTextNode('no punctuation here');
    const result = findSentenceRangeContaining(simpleNode, 3, 7);
    expect(result).toEqual({ startOffset: 0, endOffset: 19 });
  });
});

describe('extractTextFromRange', () => {
  it('extracts text from a valid range', () => {
    const textNode = document.createTextNode('Hello world');
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    
    expect(extractTextFromRange(range)).toBe('Hello');
  });

  it('returns empty string for null range', () => {
    expect(extractTextFromRange(null)).toBe('');
  });

  it('trims whitespace from extracted text', () => {
    const textNode = document.createTextNode('  spaces  ');
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 10);
    
    expect(extractTextFromRange(range)).toBe('spaces');
  });
});

describe('createRangeFromOffsets', () => {
  it('creates a range from valid text node and offsets', () => {
    const textNode = document.createTextNode('Test text');
    const range = createRangeFromOffsets(textNode, 0, 4);
    
    expect(range).not.toBeNull();
    expect(range.toString()).toBe('Test');
  });

  it('returns null for non-text nodes', () => {
    const element = document.createElement('div');
    const range = createRangeFromOffsets(element, 0, 5);
    
    expect(range).toBeNull();
  });

  it('creates range with correct offsets', () => {
    const textNode = document.createTextNode('Hello world');
    const range = createRangeFromOffsets(textNode, 6, 11);
    
    expect(range.startOffset).toBe(6);
    expect(range.endOffset).toBe(11);
    expect(range.toString()).toBe('world');
  });
});

describe('mergeOverlappingSelections', () => {
  it('replaces overlapping text with the longer selection', () => {
    const existingSelections = ['eprogramming eepro'];
    const newSelection = 'reprogramming eeprom';
    const result = mergeOverlappingSelections(existingSelections, newSelection);
    expect(result).toEqual(['reprogramming eeprom']);
  });

  it('keeps both selections when they do not overlap', () => {
    const existingSelections = ['hello'];
    const newSelection = 'world';
    const result = mergeOverlappingSelections(existingSelections, newSelection);
    expect(result).toEqual(['hello', 'world']);
  });

  it('replaces multiple overlapping selections', () => {
    const existingSelections = ['programming', 'gram ee'];
    const newSelection = 'reprogramming eeprom';
    const result = mergeOverlappingSelections(existingSelections, newSelection);
    expect(result).toEqual(['reprogramming eeprom']);
  });

  it('keeps non-overlapping and replaces overlapping selections', () => {
    const existingSelections = ['hello', 'eprogramming'];
    const newSelection = 'reprogramming eeprom';
    const result = mergeOverlappingSelections(existingSelections, newSelection);
    expect(result).toEqual(['hello', 'reprogramming eeprom']);
  });

  it('does not add duplicate selection', () => {
    const existingSelections = ['reprogramming eeprom'];
    const newSelection = 'reprogramming eeprom';
    const result = mergeOverlappingSelections(existingSelections, newSelection);
    expect(result).toEqual(['reprogramming eeprom']);
  });
});
