import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findNextSentenceEnder,
  expandSentenceBoundary,
  shortenSentenceBoundary
} from '../src/helpers/textProcessing.ts';

function createTestRange(text, startOffset, endOffset) {
  const container = document.createElement('p');
  container.textContent = text;
  document.body.appendChild(container);
  
  const textNode = container.firstChild;
  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);
  
  return { range, textNode };
}

describe('findNextSentenceEnder', () => {
  const testCases = {
    backward: [
      ['First sentence. Second sentence. Third sentence.', 30, 16, 'find last sentence ender before offset'],
      ['No sentence ender before', 10, null, 'return null if no sentence ender before offset'],
      ['One. Two. Three. Four.', 20, 17, 'handle multiple sentence enders'],
      ['Hello! How are you? Fine.', 20, 7, 'handle exclamation marks'],
      ['What? Really? Yes.', 15, 14, 'handle question marks'],
      ['Version 2.0 is here. Next sentence.', 25, 21, 'require whitespace after sentence ender'],
    ],
    forward: [
      ['First sentence. Second sentence. Third sentence.', 10, 16, 'find next sentence ender after offset'],
      ['No sentence ender after', 10, null, 'return null if no sentence ender after offset'],
      ['One. Two. Three. Four.', 0, 5, 'handle multiple sentence enders'],
      ['Hello! How are you? Fine.', 0, 7, 'handle exclamation marks'],
      ['What? Really? Yes.', 0, 6, 'handle question marks'],
      ['Version 2.0 is here. Next sentence.', 0, 21, 'require whitespace after sentence ender'],
    ]
  };

  Object.entries(testCases).forEach(([direction, cases]) => {
    describe(`${direction} direction`, () => {
      cases.forEach(([text, offset, expected, description]) => {
        it(`should ${description}`, () => {
          expect(findNextSentenceEnder(text, offset, direction)).toBe(expected);
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(findNextSentenceEnder('', 0, 'forward')).toBeNull();
    });

    it('should handle text with only whitespace', () => {
      expect(findNextSentenceEnder('   ', 1, 'forward')).toBeNull();
    });

    it('should handle multiple consecutive sentence enders', () => {
      expect(findNextSentenceEnder('Really?! Yes! Okay.', 0, 'forward')).toBe(9);
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
    it('should expand to previous sentence when at sentence start', () => {
      const { range } = createTestRange('First sentence. Second sentence. Third sentence.', 16, 32);
      const result = expandSentenceBoundary(range, 'start');
      
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(0);
      expect(result.toString()).toBe('First sentence. Second sentence.');
    });

    it('should not expand if already at beginning', () => {
      const { range } = createTestRange('First sentence. Second sentence.', 0, 15);
      expect(expandSentenceBoundary(range, 'start')).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const { range } = createTestRange('One. Two. Three. Four.', 10, 16);
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

      expect(expandSentenceBoundary(range, 'start')).toBeNull();
    });

    it('should return null for null range', () => {
      expect(expandSentenceBoundary(null, 'start')).toBeNull();
    });
  });

  describe('expand end boundary', () => {
    it('should expand to next sentence', () => {
      const { range } = createTestRange('First sentence. Second sentence. Third sentence.', 0, 15);
      const result = expandSentenceBoundary(range, 'end');
      
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(33);
      expect(result.toString()).toBe('First sentence. Second sentence. ');
    });

    it('should expand to end if no more sentences', () => {
      const { range } = createTestRange('First sentence. Second sentence', 0, 15);
      const result = expandSentenceBoundary(range, 'end');
      
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(31);
      expect(result.toString()).toBe('First sentence. Second sentence');
    });

    it('should handle multiple sentences', () => {
      const { range } = createTestRange('One. Two. Three. Four.', 0, 5);
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

      expect(expandSentenceBoundary(range, 'end')).toBeNull();
    });

    it('should return null for null range', () => {
      expect(expandSentenceBoundary(null, 'end')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle exclamation marks', () => {
      const { range } = createTestRange('Hello! World! Goodbye!', 0, 7);
      const result = expandSentenceBoundary(range, 'end');
      
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(14);
      expect(result.toString()).toBe('Hello! World! ');
    });

    it('should expand start when at sentence boundary with question marks', () => {
      const { range } = createTestRange('What? Really? Yes.', 6, 14);
      const result = expandSentenceBoundary(range, 'start');
      
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(0);
      expect(result.toString()).toBe('What? Really? ');
    });

    it('should expand start to include previous sentence when already at sentence start', () => {
      const text = 'First sentence here. Second sentence goes here.';
      const { range } = createTestRange(text, 21, 47);
      const result = expandSentenceBoundary(range, 'start');
      
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(47);
      expect(result.toString()).toBe(text);
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
      const { range } = createTestRange('First sentence. Second sentence. Third sentence.', 0, 48);
      const result = shortenSentenceBoundary(range, 'start');
      
      expect(result).not.toBeNull();
      expect(result.startOffset).toBe(16);
      expect(result.toString()).toBe('Second sentence. Third sentence.');
    });

    it('should return null if no sentence to shorten to', () => {
      const { range } = createTestRange('Only one sentence', 0, 17);
      expect(shortenSentenceBoundary(range, 'start')).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const { range } = createTestRange('One. Two. Three. Four.', 0, 22);
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

      expect(shortenSentenceBoundary(range, 'start')).toBeNull();
    });

    it('should return null for null range', () => {
      expect(shortenSentenceBoundary(null, 'start')).toBeNull();
    });
  });

  describe('shorten end boundary', () => {
    it('should shorten to previous sentence', () => {
      const { range } = createTestRange('First sentence. Second sentence. Third sentence.', 0, 48);
      const result = shortenSentenceBoundary(range, 'end');
      
      expect(result).not.toBeNull();
      expect(result.endOffset).toBe(33);
      expect(result.toString()).toBe('First sentence. Second sentence. ');
    });

    it('should return null if no sentence to shorten to', () => {
      const { range } = createTestRange('Only one sentence', 0, 17);
      expect(shortenSentenceBoundary(range, 'end')).toBeNull();
    });

    it('should handle multiple sentences', () => {
      const { range } = createTestRange('One. Two. Three. Four.', 0, 22);
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

      expect(shortenSentenceBoundary(range, 'end')).toBeNull();
    });

    it('should return null for null range', () => {
      expect(shortenSentenceBoundary(null, 'end')).toBeNull();
    });
  });

  describe('edge cases', () => {
    const edgeCases = [
      ['Hello! World! Goodbye!', 0, 22, 'end', 14, 'Hello! World! ', 'handle exclamation marks'],
      ['What? Really? Yes.', 0, 18, 'start', 6, null, 'handle question marks'],
      ['First. Second.', 0, 7, 'end', null, null, 'not shorten beyond opposite boundary'],
      ['Hi. Bye.', 0, 8, 'end', null, null, 'not shorten if remaining text too short'],
      ['OK. Go.', 0, 7, 'start', null, null, 'prevent removing all sentences when shortening start'],
      ['Hi. No.', 0, 7, 'end', null, null, 'prevent removing all sentences when shortening end'],
      ['First sentence here. Second one.', 0, 32, 'end', 21, 'First sentence here. ', 'allow shortening when remaining text long enough'],
    ];

    edgeCases.forEach(([text, start, end, boundary, expectedOffset, expectedText, description]) => {
      it(`should ${description}`, () => {
        const { range } = createTestRange(text, start, end);
        const result = shortenSentenceBoundary(range, boundary);
        
        if (expectedOffset === null) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
          if (boundary === 'start') {
            expect(result.startOffset).toBe(expectedOffset);
          } else {
            expect(result.endOffset).toBe(expectedOffset);
          }
          if (expectedText) {
            expect(result.toString()).toBe(expectedText);
          }
        }
      });
    });
  });
});
