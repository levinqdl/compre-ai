import { describe, it, expect, beforeEach } from 'vitest';

describe('isSameSentenceRange behavior', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should identify identical ranges as the same', () => {
    container.textContent = 'First sentence. Second sentence. Third sentence.';
    const textNode = container.firstChild;

    const range1 = document.createRange();
    range1.setStart(textNode, 0);
    range1.setEnd(textNode, 16);

    const range2 = document.createRange();
    range2.setStart(textNode, 0);
    range2.setEnd(textNode, 16);

    expect(range1.compareBoundaryPoints(Range.START_TO_START, range2)).toBe(0);
    expect(range1.compareBoundaryPoints(Range.END_TO_END, range2)).toBe(0);
  });

  it('should identify different ranges as not the same', () => {
    container.textContent = 'First sentence. Second sentence. Third sentence.';
    const textNode = container.firstChild;

    const range1 = document.createRange();
    range1.setStart(textNode, 0);
    range1.setEnd(textNode, 16);

    const range2 = document.createRange();
    range2.setStart(textNode, 17);
    range2.setEnd(textNode, 33);

    expect(
      range1.compareBoundaryPoints(Range.START_TO_START, range2) === 0 &&
      range1.compareBoundaryPoints(Range.END_TO_END, range2) === 0
    ).toBe(false);
  });

  it('should identify overlapping but different ranges', () => {
    container.textContent = 'First sentence. Second sentence. Third sentence.';
    const textNode = container.firstChild;

    const range1 = document.createRange();
    range1.setStart(textNode, 0);
    range1.setEnd(textNode, 20);

    const range2 = document.createRange();
    range2.setStart(textNode, 0);
    range2.setEnd(textNode, 33);

    const sameStart = range1.compareBoundaryPoints(Range.START_TO_START, range2) === 0;
    const sameEnd = range1.compareBoundaryPoints(Range.END_TO_END, range2) === 0;

    expect(sameStart).toBe(true);
    expect(sameEnd).toBe(false);
    expect(sameStart && sameEnd).toBe(false);
  });
});

describe('Accumulated text reset behavior simulation', () => {
  it('should reset accumulated texts when sentence range changes', () => {
    let accumulatedTexts = ['word1', 'word2'];
    let currentSentenceRange = { start: 0, end: 16 };
    
    const newSentenceRange = { start: 17, end: 33 };
    
    const isSame = currentSentenceRange.start === newSentenceRange.start &&
                   currentSentenceRange.end === newSentenceRange.end;
    
    if (!isSame) {
      accumulatedTexts = [];
      currentSentenceRange = newSentenceRange;
    }
    
    expect(accumulatedTexts).toEqual([]);
    expect(currentSentenceRange).toEqual(newSentenceRange);
  });

  it('should keep accumulated texts when sentence range is the same', () => {
    let accumulatedTexts = ['word1', 'word2'];
    let currentSentenceRange = { start: 0, end: 16 };
    
    const newSentenceRange = { start: 0, end: 16 };
    
    const isSame = currentSentenceRange.start === newSentenceRange.start &&
                   currentSentenceRange.end === newSentenceRange.end;
    
    if (!isSame) {
      accumulatedTexts = [];
      currentSentenceRange = newSentenceRange;
    }
    
    const newText = 'word3';
    if (!accumulatedTexts.includes(newText)) {
      accumulatedTexts.push(newText);
    }
    
    expect(accumulatedTexts).toEqual(['word1', 'word2', 'word3']);
  });
});
