import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findNextSentenceEnder,
  expandSentenceBoundary,
  shortenSentenceBoundary
} from '../src/helpers/textProcessing.ts';

describe('findNextSentenceEnder', () => {
  describe('backward direction', () => {
    it('should find the last sentence ender before offset', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = findNextSentenceEnder(text, 30, 'backward');
      expect(result).toBe(16);
    });

    it('should return null if no sentence ender before offset', () => {
      const text = 'No sentence ender before';
      const result = findNextSentenceEnder(text, 10, 'backward');
      expect(result).toBeNull();
    });

    it('should handle multiple sentence enders', () => {
      const text = 'One. Two. Three. Four.';
      const result = findNextSentenceEnder(text, 20, 'backward');
      expect(result).toBe(17);
    });

    it('should handle exclamation marks', () => {
      const text = 'Hello! How are you? Fine.';
      const result = findNextSentenceEnder(text, 20, 'backward');
      expect(result).toBe(7);
    });

    it('should handle question marks', () => {
      const text = 'What? Really? Yes.';
      const result = findNextSentenceEnder(text, 15, 'backward');
      expect(result).toBe(14);
    });

    it('should require whitespace after sentence ender', () => {
      const text = 'Version 2.0 is here. Next sentence.';
      const result = findNextSentenceEnder(text, 25, 'backward');
      expect(result).toBe(21);
    });
  });

  describe('forward direction', () => {
    it('should find the next sentence ender after offset', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = findNextSentenceEnder(text, 10, 'forward');
      expect(result).toBe(16);
    });

    it('should return null if no sentence ender after offset', () => {
      const text = 'No sentence ender after';
      const result = findNextSentenceEnder(text, 10, 'forward');
      expect(result).toBeNull();
    });

    it('should handle multiple sentence enders', () => {
      const text = 'One. Two. Three. Four.';
      const result = findNextSentenceEnder(text, 0, 'forward');
      expect(result).toBe(5);
    });

    it('should handle exclamation marks', () => {
      const text = 'Hello! How are you? Fine.';
      const result = findNextSentenceEnder(text, 0, 'forward');
      expect(result).toBe(7);
    });

    it('should handle question marks', () => {
      const text = 'What? Really? Yes.';
      const result = findNextSentenceEnder(text, 0, 'forward');
      expect(result).toBe(6);
    });

    it('should require whitespace after sentence ender', () => {
      const text = 'Version 2.0 is here. Next sentence.';
      const result = findNextSentenceEnder(text, 0, 'forward');
      expect(result).toBe(21);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = findNextSentenceEnder('', 0, 'forward');
      expect(result).toBeNull();
    });

    it('should handle text with only whitespace', () => {
      const result = findNextSentenceEnder('   ', 1, 'forward');
      expect(result).toBeNull();
    });

    it('should handle multiple consecutive sentence enders', () => {
      const text = 'Really?! Yes! Okay.';
      const result = findNextSentenceEnder(text, 0, 'forward');
      expect(result).toBe(9);
    });
  });
});

describe('expandSentenceBoundary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('expand start boundary', () => {
    it('should expand to previous sentence', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence. Third sentence.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 16);
      range.setEnd(textNode, 32);

      const result = expandSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should not expand if already at beginning', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 15);

      const result = expandSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const container = document.createElement('p');
      container.textContent = 'One. Two. Three. Four.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10);
      range.setEnd(textNode, 16);

      const result = expandSentenceBoundary(range, 'start');
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(5);
      expect(result.toString()).toBe('Two. Three.');
    });

    it('should return null for non-text node', () => {
      const container = document.createElement('p');
      container.innerHTML = '<span>Text</span>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(container, 1);

      const result = expandSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should return null for null range', () => {
      const result = expandSentenceBoundary(null, 'start');
      expect(result).toBeNull();
    });
  });

  describe('expand end boundary', () => {
    it('should expand to next sentence', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence. Third sentence.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 15);

      const result = expandSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(33);
      expect(result.toString()).toBe('First sentence. Second sentence. ');
    });

    it('should expand to end if no more sentences', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 15);

      const result = expandSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(31);
      expect(result.toString()).toBe('First sentence. Second sentence');
    });

    it('should handle multiple sentences', () => {
      const container = document.createElement('p');
      container.textContent = 'One. Two. Three. Four.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const result = expandSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(10);
      expect(result.toString()).toBe('One. Two. ');
    });

    it('should return null for non-text node', () => {
      const container = document.createElement('p');
      container.innerHTML = '<span>Text</span>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(container, 1);

      const result = expandSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should return null for null range', () => {
      const result = expandSentenceBoundary(null, 'end');
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle exclamation marks', () => {
      const container = document.createElement('p');
      container.textContent = 'Hello! World! Goodbye!';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 7);

      const result = expandSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(14);
      expect(result.toString()).toBe('Hello! World! ');
    });

    it('should handle question marks', () => {
      const container = document.createElement('p');
      container.textContent = 'What? Really? Yes.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.setEnd(textNode, 14);

      const result = expandSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });
  });
});

describe('shortenSentenceBoundary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('shorten start boundary', () => {
    it('should shorten to next sentence', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence. Third sentence.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 48);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(16);
      expect(result.toString()).toBe('Second sentence. Third sentence.');
    });

    it('should return null if no sentence to shorten to', () => {
      const container = document.createElement('p');
      container.textContent = 'Only one sentence';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 17);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const container = document.createElement('p');
      container.textContent = 'One. Two. Three. Four.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 22);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(5);
      expect(result.toString()).toBe('Two. Three. Four.');
    });

    it('should return null for non-text node', () => {
      const container = document.createElement('p');
      container.innerHTML = '<span>Text</span>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(container, 1);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should return null for null range', () => {
      const result = shortenSentenceBoundary(null, 'start');
      expect(result).toBeNull();
    });
  });

  describe('shorten end boundary', () => {
    it('should shorten to previous sentence', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence. Second sentence. Third sentence.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 48);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(33);
      expect(result.toString()).toBe('First sentence. Second sentence. ');
    });

    it('should return null if no sentence to shorten to', () => {
      const container = document.createElement('p');
      container.textContent = 'Only one sentence';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 17);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const container = document.createElement('p');
      container.textContent = 'One. Two. Three. Four.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 22);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(17);
      expect(result.toString()).toBe('One. Two. Three. ');
    });

    it('should return null for non-text node', () => {
      const container = document.createElement('p');
      container.innerHTML = '<span>Text</span>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(container, 1);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should return null for null range', () => {
      const result = shortenSentenceBoundary(null, 'end');
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle exclamation marks', () => {
      const container = document.createElement('p');
      container.textContent = 'Hello! World! Goodbye!';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 22);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(14);
      expect(result.toString()).toBe('Hello! World! ');
    });

    it('should handle question marks', () => {
      const container = document.createElement('p');
      container.textContent = 'What? Really? Yes.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 18);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(6);
    });

    it('should not shorten beyond the opposite boundary', () => {
      const container = document.createElement('p');
      container.textContent = 'First. Second.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 7);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should not shorten if remaining text is too short', () => {
      const container = document.createElement('p');
      container.textContent = 'Hi. Bye.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 8);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should prevent removing all sentences when shortening start', () => {
      const container = document.createElement('p');
      container.textContent = 'OK. Go.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 7);

      const result = shortenSentenceBoundary(range, 'start');
      expect(result).toBeNull();
    });

    it('should prevent removing all sentences when shortening end', () => {
      const container = document.createElement('p');
      container.textContent = 'Hi. No.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 7);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).toBeNull();
    });

    it('should allow shortening when remaining text is long enough', () => {
      const container = document.createElement('p');
      container.textContent = 'First sentence here. Second one.';
      document.body.appendChild(container);

      const textNode = container.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 32);

      const result = shortenSentenceBoundary(range, 'end');
      expect(result).not.toBeNull();
      expect(result.toString()).toBe('First sentence here. ');
    });
  });
});
