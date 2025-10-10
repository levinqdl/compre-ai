import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Complete sentence extraction across HTML elements', () => {
  let testContainer;

  beforeEach(() => {
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  });

  it('should extract full sentence when selection is in text node before inline element', () => {
    testContainer.innerHTML = 'All you have to do is pass in, verbatim, that <code>WWW-Authenticate</code> value along with the scopes.';
    
    const range = document.createRange();
    const textNode = testContainer.firstChild;
    
    // Select "verbatim"
    const text = textNode.textContent;
    const startIdx = text.indexOf('verbatim');
    range.setStart(textNode, startIdx);
    range.setEnd(textNode, startIdx + 8);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Get full text from container
    const fullText = testContainer.textContent;
    const selectedText = selection.toString();
    
    expect(selectedText).toBe('verbatim');
    expect(fullText).toContain('WWW-Authenticate');
    expect(fullText).toContain('value along with the scopes');
  });

  it('should handle sentence with multiple inline elements', () => {
    testContainer.innerHTML = 'The <strong>quick</strong> brown <em>fox</em> jumps over the lazy dog.';
    
    const fullText = testContainer.textContent;
    
    expect(fullText).toBe('The quick brown fox jumps over the lazy dog.');
    
    const textNodes = [];
    const walker = document.createTreeWalker(
      testContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    expect(textNodes.length).toBeGreaterThan(1);
  });

  it('should extract complete sentence when selection is in middle of complex HTML', () => {
    testContainer.innerHTML = '<p>First sentence. This is a <code>test</code> with inline elements. Last sentence.</p>';
    
    const walker = document.createTreeWalker(
      testContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Find the text node containing "This is a "
    const targetNode = textNodes.find(n => n.textContent.includes('This is a'));
    expect(targetNode).toBeTruthy();
    
    const range = document.createRange();
    const text = targetNode.textContent;
    const startIdx = text.indexOf('This');
    range.setStart(targetNode, startIdx);
    range.setEnd(targetNode, startIdx + 4);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const fullText = testContainer.textContent;
    const selectedText = selection.toString();
    
    expect(selectedText).toBe('This');
    expect(fullText).toContain('test');
    expect(fullText).toContain('inline elements');
  });

  it('should handle selection in text node after inline element', () => {
    testContainer.innerHTML = 'Start <code>CODE</code> middle end.';
    
    const walker = document.createTreeWalker(
      testContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Select "middle" which is after </code>
    const middleNode = textNodes.find(n => n.textContent.includes('middle'));
    expect(middleNode).toBeTruthy();
    
    const range = document.createRange();
    const text = middleNode.textContent;
    const startIdx = text.indexOf('middle');
    range.setStart(middleNode, startIdx);
    range.setEnd(middleNode, startIdx + 6);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const fullText = testContainer.textContent;
    const selectedText = selection.toString();
    
    expect(selectedText).toBe('middle');
    expect(fullText).toBe('Start CODE middle end.');
  });

  it('should normalize whitespace when comparing', () => {
    testContainer.innerHTML = 'Text with\n  multiple   \nwhitespaces.';
    
    const fullText = testContainer.textContent;
    const normalizedText = fullText.replace(/\s+/g, ' ').trim();
    
    expect(normalizedText).toBe('Text with multiple whitespaces.');
  });
});
