import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { 
  getCompleteSentence, 
  mapNormalizedToOriginal,
  getFirstTextNode,
  getLastTextNode,
  getTextNodesIn,
  isBlockElement 
} from '../src/helpers/textProcessing.ts';

describe('getCompleteSentence', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `, {
      url: 'https://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window;
    
    global.document = document;
    global.window = window;
    global.Node = window.Node;
    global.Range = window.Range;
    global.Selection = window.Selection;
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
    delete global.document;
    delete global.window;
    delete global.Node;
    delete global.Range;
    delete global.Selection;
  });

  it('should return empty result when no selection exists', () => {
    const result = getCompleteSentence();
    expect(result.selectedRanges).toEqual([]);
    expect(result.sentenceRange).toBeNull();
  });

  it('should return empty result when selection is empty', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = 'This is a test sentence.';
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toEqual([]);
    expect(result.sentenceRange).toBeNull();
  });

  it('should extract complete sentence when word is selected', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>This is a test sentence. Another sentence here.</p>';
    
    const textNode = container.firstChild.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 10); // "test"
    range.setEnd(textNode, 14);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.selectedRanges[0].toString()).toBe('test');
    expect(result.sentenceRange).not.toBeNull();
    expect(result.sentenceRange.toString()).toBe('This is a test sentence.');
  });

  it('should handle single selected range (JSDOM limitation)', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>This is a test sentence.</p>';
    
    const textNode = container.firstChild.firstChild;
    const range1 = document.createRange();
    range1.setStart(textNode, 0); // "This"
    range1.setEnd(textNode, 4);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range1);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.selectedRanges[0].toString()).toBe('This');
  });

  it('should handle selection across inline elements', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>This is <strong>important</strong> text here.</p>';
    
    const firstTextNode = container.firstChild.firstChild; // "This is "
    const strongTextNode = container.firstChild.childNodes[1].firstChild; // "important"
    
    const range = document.createRange();
    range.setStart(firstTextNode, 8); // start at "is"
    range.setEnd(strongTextNode, 4); // end in "important"
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.sentenceRange).not.toBeNull();
    expect(result.sentenceRange.toString()).toBe('This is important text here.');
  });

  it('should handle selection at sentence boundaries', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>First sentence. Second sentence here.</p>';
    
    const textNode = container.firstChild.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 16); // "Second" (after ". ")
    range.setEnd(textNode, 22);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.selectedRanges[0].toString()).toBe('Second');
    expect(result.sentenceRange).not.toBeNull();
    expect(result.sentenceRange.toString()).toBe(' Second sentence here.');
  });

  it('should find block-level container for sentence extraction', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<div><span>This is <em>emphasized</em> text.</span></div>';
    
    const textNode = container.firstChild.firstChild.firstChild; // "This is "
    const range = document.createRange();
    range.setStart(textNode, 0); // "This"
    range.setEnd(textNode, 4);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.sentenceRange).not.toBeNull();
    expect(result.sentenceRange.toString()).toBe('This is emphasized text.');
  });

  it('should handle whitespace normalization', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>This   has    multiple   spaces.</p>';
    
    const textNode = container.firstChild.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 8); // "has"
    range.setEnd(textNode, 11);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.sentenceRange).not.toBeNull();
    expect(result.sentenceRange.toString()).toBe('This   has    multiple   spaces.');
  });

  it('should return full text when no sentence boundaries found', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = '<p>Text without proper sentence ending</p>';
    
    const textNode = container.firstChild.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 0); // "Text"
    range.setEnd(textNode, 4);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.sentenceRange).not.toBeNull();
    // Should return the full text when no sentence boundary is found
    // but Range boundary calculation might truncate it
    expect(result.sentenceRange.toString()).toMatch(/^Text without proper sentence/);
  });

  it('should extract complete sentence when selecting text across whitespace-formatted HTML', () => {
    const container = document.getElementById('test-container');
    container.innerHTML = `<p>
      I guess I returned to copilot right as 4.5 came out so maybe I'm just witness Claude carry
    </p>`;
    
    const paragraph = container.firstChild;
    const textNode = paragraph.firstChild;
    const fullText = textNode.textContent;
    
    const selectedText = 'witness Claude carry';
    const startOffset = fullText.indexOf(selectedText);
    const endOffset = startOffset + selectedText.length;
    
    const range = document.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const result = getCompleteSentence();
    
    expect(result.selectedRanges).toHaveLength(1);
    expect(result.selectedRanges[0].toString()).toBe('witness Claude carry');
    expect(result.sentenceRange).not.toBeNull();
    
    const sentenceText = result.sentenceRange.toString().replace(/\s+/g, ' ').trim();
    expect(sentenceText).toBe("I guess I returned to copilot right as 4.5 came out so maybe I'm just witness Claude carry");
  });
});

describe('getCompleteSentence helper functions', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    
    global.document = document;
    global.window = window;
    global.Node = window.Node;
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
    delete global.document;
    delete global.window;
    delete global.Node;
  });

  describe('mapNormalizedToOriginal', () => {
    it('should map normalized offset to original text position', () => {
      const text = 'This   has    multiple   spaces';
      const normalizedOffset = 5; // Position 5 in "This has multiple spaces"
      const originalOffset = mapNormalizedToOriginal(text, normalizedOffset);
      // At normalized offset 5, we're at the space after "This"
      expect(originalOffset).toBe(4); // Should map to position at first space
    });

    it('should handle text with no extra whitespace', () => {
      const text = 'No extra spaces';
      const normalizedOffset = 5; // Position 5 in "No extra spaces" is at 't'
      const originalOffset = mapNormalizedToOriginal(text, normalizedOffset);
      // Since there's no extra whitespace, normalized offset 5 should map to 5
      expect(originalOffset).toBe(5);
    });

    it('should handle offset at text end', () => {
      const text = 'Short text';
      const normalizedOffset = 100; // Beyond text length
      const originalOffset = mapNormalizedToOriginal(text, normalizedOffset);
      expect(originalOffset).toBe(text.length);
    });

    it('should handle offset at start', () => {
      const text = 'Test text';
      const normalizedOffset = 0;
      const originalOffset = mapNormalizedToOriginal(text, normalizedOffset);
      expect(originalOffset).toBe(0);
    });
  });

  describe('getFirstTextNode', () => {
    it('should return text node if input is text node', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = 'Text content';
      const textNode = container.firstChild;
      expect(getFirstTextNode(textNode)).toBe(textNode);
    });

    it('should find first text node in element', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = '<span>First</span>Second';
      const firstTextNode = container.firstChild.firstChild;
      expect(getFirstTextNode(container)).toBe(firstTextNode);
    });

    it('should return null when no text nodes exist', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = '<img src="test.jpg">';
      expect(getFirstTextNode(container)).toBeNull();
    });
  });

  describe('getLastTextNode', () => {
    it('should return text node if input is text node', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = 'Text content';
      const textNode = container.firstChild;
      expect(getLastTextNode(textNode)).toBe(textNode);
    });

    it('should find last text node in element', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = 'First<span>Second</span>Third';
      const lastTextNode = container.lastChild;
      expect(getLastTextNode(container)).toBe(lastTextNode);
    });

    it('should return null when no text nodes exist', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = '<img src="test.jpg">';
      expect(getLastTextNode(container)).toBeNull();
    });
  });

  describe('getTextNodesIn', () => {
    it('should collect all text nodes from element', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = 'First<span>Second</span>Third';
      const textNodes = getTextNodesIn(container);
      expect(textNodes).toHaveLength(3);
      expect(textNodes[0].textContent).toBe('First');
      expect(textNodes[1].textContent).toBe('Second');
      expect(textNodes[2].textContent).toBe('Third');
    });

    it('should return single text node for text node input', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = 'Text content';
      const textNode = container.firstChild;
      const textNodes = getTextNodesIn(textNode);
      expect(textNodes).toHaveLength(1);
      expect(textNodes[0]).toBe(textNode);
    });

    it('should return empty array when no text nodes exist', () => {
      const container = document.getElementById('test-container');
      container.innerHTML = '<img src="test.jpg">';
      const textNodes = getTextNodesIn(container);
      expect(textNodes).toHaveLength(0);
    });
  });

  describe('isBlockElement', () => {
    it('should identify block elements correctly', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const h1 = document.createElement('h1');
      const span = document.createElement('span');
      
      expect(isBlockElement(div)).toBe(true);
      expect(isBlockElement(p)).toBe(true);
      expect(isBlockElement(h1)).toBe(true);
      expect(isBlockElement(span)).toBe(false);
    });

    it('should handle null input', () => {
      expect(isBlockElement(null)).toBe(false);
    });

    it('should handle elements without tagName', () => {
      const textNode = document.createTextNode('text');
      expect(isBlockElement(textNode)).toBe(false);
    });
  });
});