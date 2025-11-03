import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mapSidePanelSelectionToSentenceRange, getTextNodesIn } from '../src/helpers/textProcessing.ts';
import { JSDOM } from 'jsdom';

describe('mapSidePanelSelectionToSentenceRange', () => {
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

  it('should return null when no selection exists', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const textNode = mainContainer.firstChild;
    mainRange.setStart(textNode, 0);
    mainRange.setEnd(textNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    expect(result).toBeNull();
  });

  it('should map simple text selection from side panel to main DOM range', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNode = sidePanelContainer.firstChild;
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNode, 10);
    sidePanelRange.setEnd(sidePanelTextNode, 14);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('test');
  });

  it('should handle selection with highlighted text (mark tags)', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a <mark>test</mark> sentence.';
    document.body.appendChild(sidePanelContainer);

    const textNodes = getTextNodesIn(sidePanelContainer);
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(textNodes[1], 0);
    sidePanelRange.setEnd(textNodes[1], 4);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('test');
  });

  it('should handle selection spanning multiple text nodes in side panel', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a <mark>test</mark> sentence.';
    document.body.appendChild(sidePanelContainer);

    const textNodes = getTextNodesIn(sidePanelContainer);
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(textNodes[0], 8);
    sidePanelRange.setEnd(textNodes[2], 9);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('a test sentence');
  });

  it('should return null for empty selection', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNode = sidePanelContainer.firstChild;
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNode, 8);
    sidePanelRange.setEnd(sidePanelTextNode, 8);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).toBeNull();
  });

  it('should handle selection when side panel has whitespace differences', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This  is   a    test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNode = sidePanelContainer.firstChild;
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNode, 10);
    sidePanelRange.setEnd(sidePanelTextNode, 14);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString().replace(/\s+/g, ' ').trim()).toBe('test');
  });

  it('should return null when selection is outside side panel container', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const outsideContainer = document.createElement('div');
    outsideContainer.innerHTML = 'Outside text';
    document.body.appendChild(outsideContainer);

    const outsideTextNode = outsideContainer.firstChild;
    const outsideRange = document.createRange();
    outsideRange.setStart(outsideTextNode, 0);
    outsideRange.setEnd(outsideTextNode, 7);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(outsideRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).toBeNull();
  });

  it('should handle complex HTML structure with nested elements', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = '<p>This is a <strong>complex</strong> test sentence.</p>';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const p = mainContainer.querySelector('p');
    const textNodes = getTextNodesIn(p);
    mainRange.setStart(textNodes[0], 0);
    mainRange.setEnd(textNodes[2], textNodes[2].textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a <mark>complex</mark> test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNodes = getTextNodesIn(sidePanelContainer);
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNodes[1], 0);
    sidePanelRange.setEnd(sidePanelTextNodes[1], 7);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('complex');
  });

  it('should handle selection at the beginning of sentence', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNode = sidePanelContainer.firstChild;
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNode, 0);
    sidePanelRange.setEnd(sidePanelTextNode, 4);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('This');
  });

  it('should handle selection at the end of sentence', () => {
    const mainContainer = document.createElement('div');
    mainContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 0);
    mainRange.setEnd(mainTextNode, mainContainer.textContent.length);

    const sidePanelContainer = document.createElement('div');
    sidePanelContainer.innerHTML = 'This is a test sentence.';
    document.body.appendChild(sidePanelContainer);

    const sidePanelTextNode = sidePanelContainer.firstChild;
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(sidePanelTextNode, 15);
    sidePanelRange.setEnd(sidePanelTextNode, 23);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('sentence');
  });

  it('should correctly map selection after highlighted word in side panel with mark tags', () => {
    const mainContainer = document.createElement('p');
    mainContainer.innerHTML = '"Waste time?"  Ugh.  I do some marketing ops work, where businesses call me in after their data is FUCKED, and they realize due to a lack of normalization, they can\'t run any of their marketing campaigns.';
    document.body.appendChild(mainContainer);

    const mainRange = document.createRange();
    const mainTextNode = mainContainer.firstChild;
    mainRange.setStart(mainTextNode, 27);
    mainRange.setEnd(mainTextNode, 188);

    const sidePanelContainer = document.createElement('span');
    sidePanelContainer.innerHTML = '  I do some marketing <mark style="background-color: #fff3cd; padding: 1px 2px; border-radius: 2px;">ops</mark> work, where businesses call me in after their data is FUCKED, and they realize due to a lack of normalization, they can\'t run any of their marketing campaigns.';
    document.body.appendChild(sidePanelContainer);

    const textNodes = getTextNodesIn(sidePanelContainer);
    const sidePanelRange = document.createRange();
    sidePanelRange.setStart(textNodes[2], 24);
    sidePanelRange.setEnd(textNodes[2], 28);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(sidePanelRange);

    const result = mapSidePanelSelectionToSentenceRange(sidePanelContainer, mainRange);
    
    expect(result).not.toBeNull();
    expect(result.toString()).toBe('call');
  });
});
