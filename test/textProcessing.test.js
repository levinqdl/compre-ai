import { describe, it, expect } from 'vitest';
import { extractSentenceContaining, escapeHtml, highlightSelectedInSentence } from '../src/helpers/textProcessing.js';

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
