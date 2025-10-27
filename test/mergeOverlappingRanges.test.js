import { describe, it, expect, beforeEach } from 'vitest';
import { mergeOverlappingRanges, extractTextFromRange } from '../src/helpers/textProcessing.ts';
import { JSDOM } from 'jsdom';

describe('mergeOverlappingRanges', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    global.Node = dom.window.Node;
    global.Range = dom.window.Range;
  });

  function createRangeFromText(text) {
    const container = document.getElementById('container');
    const textNode = document.createTextNode(text);
    container.appendChild(textNode);
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return range;
  }

  function createRangeWithOffset(text, start, end) {
    const container = document.getElementById('container');
    const textNode = document.createTextNode(text);
    container.appendChild(textNode);
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    return range;
  }

  it('replaces overlapping range with the longer selection', () => {
    const existingRanges = [createRangeFromText('eprogramming eepro')];
    const newRange = createRangeFromText('reprogramming eeprom');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    expect(result).toHaveLength(1);
    expect(extractTextFromRange(result[0])).toBe('reprogramming eeprom');
  });

  it('keeps both ranges when they do not overlap', () => {
    const existingRanges = [createRangeFromText('hello')];
    const newRange = createRangeFromText('world');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    expect(result).toHaveLength(2);
    expect(extractTextFromRange(result[0])).toBe('hello');
    expect(extractTextFromRange(result[1])).toBe('world');
  });

  it('replaces multiple overlapping ranges', () => {
    const existingRanges = [
      createRangeFromText('programming'),
      createRangeFromText('gram ee')
    ];
    const newRange = createRangeFromText('reprogramming eeprom');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    expect(result).toHaveLength(1);
    expect(extractTextFromRange(result[0])).toBe('reprogramming eeprom');
  });

  it('keeps non-overlapping and replaces overlapping ranges', () => {
    const existingRanges = [
      createRangeFromText('hello'),
      createRangeFromText('eprogramming')
    ];
    const newRange = createRangeFromText('reprogramming eeprom');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    expect(result).toHaveLength(2);
    expect(extractTextFromRange(result[0])).toBe('hello');
    expect(extractTextFromRange(result[1])).toBe('reprogramming eeprom');
  });

  it('does not add duplicate range', () => {
    const existingRanges = [createRangeFromText('reprogramming eeprom')];
    const newRange = createRangeFromText('reprogramming eeprom');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    expect(result).toHaveLength(1);
    expect(extractTextFromRange(result[0])).toBe('reprogramming eeprom');
  });

  it('handles ranges with partial text overlap', () => {
    const container = document.getElementById('container');
    const fullText = 'This is a test sentence for overlapping.';
    const textNode = document.createTextNode(fullText);
    container.appendChild(textNode);
    
    const range1 = document.createRange();
    range1.setStart(textNode, 0);
    range1.setEnd(textNode, 14);
    
    const range2 = document.createRange();
    range2.setStart(textNode, 10);
    range2.setEnd(textNode, 27);
    
    const result = mergeOverlappingRanges([range1], range2);
    
    expect(result).toHaveLength(1);
    expect(extractTextFromRange(result[0])).toBe('test sentence for');
  });

  it('handles empty range gracefully', () => {
    const existingRanges = [createRangeFromText('hello')];
    const container = document.getElementById('container');
    const textNode = document.createTextNode('');
    container.appendChild(textNode);
    const emptyRange = document.createRange();
    emptyRange.selectNodeContents(textNode);
    
    const result = mergeOverlappingRanges(existingRanges, emptyRange);
    
    expect(result).toHaveLength(1);
    expect(extractTextFromRange(result[0])).toBe('hello');
  });

  it('clones ranges to avoid mutation', () => {
    const existingRanges = [createRangeFromText('hello')];
    const newRange = createRangeFromText('world');
    
    const result = mergeOverlappingRanges(existingRanges, newRange);
    
    newRange.detach();
    
    expect(extractTextFromRange(result[1])).toBe('world');
  });
});
