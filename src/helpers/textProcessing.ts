export function isBlockElementTag(tagName?: string): boolean {
  if (!tagName) return false;
  const blockElements = [
    'P','DIV','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','LI','TD','TH','ARTICLE','SECTION','ASIDE','NAV','MAIN','HEADER','FOOTER'
  ];
  return blockElements.includes(tagName.toUpperCase());
}

export function findSentenceRangeContaining(textNode: Node, startOffset: number, endOffset: number): { startOffset: number; endOffset: number } | null {
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }
  const fullText = (textNode as Text).textContent ?? '';
  if (!fullText) return null;

  const sentenceEnders = /[.!?]+(?:\s|$)/g;
  const sentences: Array<{ startIndex: number; endIndex: number }> = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = sentenceEnders.exec(fullText)) !== null) {
    sentences.push({ startIndex: lastIndex, endIndex: match.index + match[0].length });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < fullText.length) {
    sentences.push({ startIndex: lastIndex, endIndex: fullText.length });
  }

  if (sentences.length === 0) {
    return { startOffset: 0, endOffset: fullText.length };
  }

  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i];
    if (startOffset >= sentence.startIndex && startOffset < sentence.endIndex) {
      if (endOffset <= sentence.endIndex) {
        return { startOffset: sentence.startIndex, endOffset: sentence.endIndex };
      }
      let coverageEnd = sentence.endIndex;
      let nextIndex = i + 1;
      while (endOffset > coverageEnd && nextIndex < sentences.length) {
        coverageEnd = sentences[nextIndex].endIndex;
        nextIndex += 1;
      }
      return { startOffset: sentence.startIndex, endOffset: coverageEnd };
    }
  }

  for (const sentence of sentences) {
    if (startOffset < sentence.endIndex && endOffset > sentence.startIndex) {
      return { startOffset: sentence.startIndex, endOffset: sentence.endIndex };
    }
  }

  return { startOffset, endOffset };
}

export function extractSentenceContaining(fullText: string, selectedText: string): string {
  if (!fullText || !selectedText) return selectedText || '';
  const cleanText = fullText.replace(/\s+/g, ' ').trim();
  const cleanSelected = selectedText.replace(/\s+/g, ' ').trim();
  const selectedIndex = cleanText.toLowerCase().indexOf(cleanSelected.toLowerCase());
  if (selectedIndex === -1) return selectedText;

  const sentenceEnders = /[.!?]+(?=\s|$)/g;
  const sentences: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = sentenceEnders.exec(cleanText)) !== null) {
    const sentenceWithPeriod = cleanText.substring(lastIndex, match.index + match[0].length).trim();
    if (sentenceWithPeriod) {
      const sentenceStart = cleanText.indexOf(sentenceWithPeriod, lastIndex);
      sentences.push({ text: sentenceWithPeriod, startIndex: sentenceStart, endIndex: match.index + match[0].length });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleanText.length) {
    const lastSentence = cleanText.substring(lastIndex).trim();
    if (lastSentence) {
      const sentenceStart = cleanText.indexOf(lastSentence, lastIndex);
      sentences.push({ text: lastSentence, startIndex: sentenceStart, endIndex: cleanText.length });
    }
  }

  const selectedEnd = selectedIndex + cleanSelected.length;
  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i];
    if (selectedIndex >= sentence.startIndex && selectedIndex < sentence.endIndex) {
      if (selectedEnd <= sentence.endIndex) return sentence.text;
      const combined: string[] = [sentence.text];
      let coverageEnd = sentence.endIndex;
      let nextIndex = i + 1;
      while (selectedEnd > coverageEnd && nextIndex < sentences.length) {
        const nextSentence = sentences[nextIndex];
        combined.push(nextSentence.text);
        coverageEnd = nextSentence.endIndex;
        nextIndex += 1;
      }
      return combined.join(' ');
    }
  }
  for (const sentence of sentences) {
    if (selectedIndex < sentence.endIndex && selectedEnd > sentence.startIndex) return sentence.text;
  }
  return selectedText;
}

export function extractTextFromRange(range: Range | null): string {
  if (!range) return '';
  return range.toString().trim();
}

export function createRangeFromOffsets(textNode: Node, startOffset: number, endOffset: number): Range | null {
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);
  return range;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type Selectable = string | { toString: () => string } | Range;

interface NodeOffset {
  start: number;
  end: number;
  nodeStart: number;
}

export function highlightSelectedInSentence(sentenceRange: Range, selectedRanges: Range[]): string {
  const sentenceStr = sentenceRange.toString();
  
  if (!sentenceStr) return escapeHtml('');
  if (!selectedRanges || selectedRanges.length === 0) return escapeHtml(sentenceStr);

  const sentenceTextNodes = getTextNodesIn(sentenceRange.commonAncestorContainer);
  const highlights: Array<{ start: number; end: number }> = [];
  let currentOffset = 0;
  
  const nodeOffsetMap = new Map<Text, NodeOffset>();
  sentenceTextNodes.forEach((node) => {
    const nodeText = node.textContent || '';
    let nodeStartInSentence = 0;
    let nodeEndInSentence = nodeText.length;
    
    if (node === sentenceRange.startContainer) {
      nodeStartInSentence = sentenceRange.startOffset;
    }
    if (node === sentenceRange.endContainer) {
      nodeEndInSentence = sentenceRange.endOffset;
    }
    
    const isNodeInSentenceRange = 
      sentenceRange.intersectsNode(node) &&
      nodeStartInSentence < nodeEndInSentence;
    
    if (isNodeInSentenceRange) {
      const effectiveLength = nodeEndInSentence - nodeStartInSentence;
      nodeOffsetMap.set(node, { 
        start: currentOffset, 
        end: currentOffset + effectiveLength,
        nodeStart: nodeStartInSentence 
      });
      currentOffset += effectiveLength;
    }
  });
  
  selectedRanges.forEach((selectedRange) => {
    const selectedTextNodes = getTextNodesIn(selectedRange.commonAncestorContainer);
    
    selectedTextNodes.forEach((selectedNode) => {
      const nodeMapping = nodeOffsetMap.get(selectedNode);
      if (nodeMapping) {
        let selectionStart = 0;
        let selectionEnd = (selectedNode.textContent || '').length;
        
        if (selectedRange.startContainer === selectedNode) {
          selectionStart = selectedRange.startOffset;
        }
        if (selectedRange.endContainer === selectedNode) {
          selectionEnd = selectedRange.endOffset;
        }
        
        const adjustedStart = Math.max(0, selectionStart - nodeMapping.nodeStart);
        const adjustedEnd = Math.max(0, selectionEnd - nodeMapping.nodeStart);
        
        if (adjustedStart < adjustedEnd) {
          highlights.push({
            start: nodeMapping.start + adjustedStart,
            end: nodeMapping.start + adjustedEnd
          });
        }
      }
    });
  });
  
  highlights.sort((a, b) => a.start - b.start);
  
  const mergedHighlights: Array<{ start: number; end: number }> = [];
  highlights.forEach((highlight) => {
    if (mergedHighlights.length === 0) {
      mergedHighlights.push(highlight);
    } else {
      const last = mergedHighlights[mergedHighlights.length - 1];
      if (highlight.start <= last.end) {
        last.end = Math.max(last.end, highlight.end);
      } else {
        mergedHighlights.push(highlight);
      }
    }
  });
  
  let result = '';
  let lastIndex = 0;
  mergedHighlights.forEach((highlight) => {
    result += escapeHtml(sentenceStr.substring(lastIndex, highlight.start));
    result += '<mark style="background-color: #fff3cd; padding: 1px 2px; border-radius: 2px;">';
    result += escapeHtml(sentenceStr.substring(highlight.start, highlight.end));
    result += '</mark>';
    lastIndex = highlight.end;
  });
  result += escapeHtml(sentenceStr.substring(lastIndex));
  
  return result;
}

export function buildTranslationRequestPayload({ selectedText, completeSentence, targetLanguage }: { selectedText: Selectable | Selectable[]; completeSentence: Selectable; targetLanguage?: string }) {
  const extractText = (input: Selectable | undefined | null): string => {
    if (!input) return '';
    if (typeof input === 'string') return input.trim();
    if (typeof (input as any).toString === 'function') return (input as any).toString().trim();
    return '';
  };
  const sentence = extractText(completeSentence);
  let textArray: string[];
  if (Array.isArray(selectedText)) {
    textArray = selectedText.map((t) => extractText(t)).filter((t) => t.length > 0);
  } else {
    const singleText = extractText(selectedText);
    textArray = singleText ? [singleText] : [];
  }
  return {
    text: textArray,
    completeSentence: sentence || (textArray.length > 0 ? textArray.join(' ') : ''),
    to: targetLanguage || 'zh',
    detect_source: true,
  };
}

export function mergeOverlappingRanges(existingRanges: Range[], newRange: Range): Range[] {
  const hasOverlapOrContainment = (range1: Range, range2: Range): boolean => {
    try {
      const text1 = extractTextFromRange(range1);
      const text2 = extractTextFromRange(range2);
      
      if (!text1 || !text2) return false;
      
      if (text1 === text2) return true;
      
      if (text1.includes(text2) || text2.includes(text1)) {
        return true;
      }
      
      const words1 = text1.split(/\s+/).filter(w => w.length > 2);
      const words2 = text2.split(/\s+/).filter(w => w.length > 2);
      
      for (const word1 of words1) {
        for (const word2 of words2) {
          if (word1.includes(word2) || word2.includes(word1)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  };
  
  const newText = extractTextFromRange(newRange);
  if (!newText) return existingRanges;
  
  const isDuplicate = existingRanges.some(existing => {
    return extractTextFromRange(existing) === newText;
  });
  
  if (isDuplicate) {
    return existingRanges;
  }
  
  const filteredRanges = existingRanges.filter(existing => {
    return !hasOverlapOrContainment(existing, newRange);
  });
  
  filteredRanges.push(newRange.cloneRange());
  return filteredRanges;
}

export function mapNormalizedToOriginal(text: string, normalizedOffset: number): number {
  let normalizedCount = 0;
  let inWhitespace = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isWhitespace = /\s/.test(char);
    
    if (isWhitespace) {
      if (!inWhitespace) {
        normalizedCount++;
        inWhitespace = true;
        if (normalizedCount >= normalizedOffset) {
          return i;
        }
      }
    } else {
      normalizedCount++;
      inWhitespace = false;
      if (normalizedCount > normalizedOffset) {
        return i;
      }
    }
  }
  
  return text.length;
}

export function getFirstTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  for (const child of Array.from(node.childNodes)) {
    const textNode = getFirstTextNode(child);
    if (textNode) return textNode;
  }
  return null;
}

export function getLastTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const textNode = getLastTextNode(node.childNodes[i]!);
    if (textNode) return textNode;
  }
  return null;
}

export function getTextNodesIn(node: Node): Text[] {
  const textNodes: Text[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    textNodes.push(node as Text);
  } else {
    for (const child of Array.from(node.childNodes)) {
      textNodes.push(...getTextNodesIn(child));
    }
  }
  return textNodes;
}

export function isBlockElement(element: Element | null): boolean {
  if (!element || !('tagName' in element)) return false;
  const blockElements = [
    'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
    'BLOCKQUOTE', 'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 
    'ASIDE', 'NAV', 'MAIN', 'HEADER', 'FOOTER'
  ];
  return blockElements.includes(element.tagName.toUpperCase());
}

export function findNextSentenceEnder(text: string, fromOffset: number, direction: 'forward' | 'backward'): number | null {
  const sentenceEnders = /[.!?]+\s+/g;
  
  if (direction === 'backward') {
    let lastMatchEnd: number | null = null;
    let match: RegExpExecArray | null;
    
    while ((match = sentenceEnders.exec(text)) !== null) {
      const matchEnd = match.index + match[0].length;
      if (matchEnd < fromOffset) {
        lastMatchEnd = matchEnd;
      }
    }
    
    return lastMatchEnd;
  } else {
    sentenceEnders.lastIndex = fromOffset;
    const match = sentenceEnders.exec(text);
    if (match) {
      return match.index + match[0].length;
    }
    return null;
  }
}

export function expandSentenceBoundary(range: Range | null, boundary: 'start' | 'end'): Range | null {
  if (!range) return null;
  
  const container = boundary === 'start' ? range.startContainer : range.endContainer;
  const offset = boundary === 'start' ? range.startOffset : range.endOffset;
  
  if (container.nodeType !== Node.TEXT_NODE) return null;
  
  const textNode = container as Text;
  const textContent = textNode.textContent || '';
  
  if (boundary === 'start') {
    const newOffset = findNextSentenceEnder(textContent, offset, 'backward');
    
    if (newOffset !== null && newOffset < offset) {
      const newRange = document.createRange();
      newRange.setStart(textNode, newOffset);
      newRange.setEnd(range.endContainer, range.endOffset);
      return newRange;
    } else if (newOffset === null && offset > 0) {
      const precedingText = textContent.substring(Math.max(0, offset - 3), offset);
      if (/[.!?]\s*$/.test(precedingText)) {
        const previousSentenceEnd = findNextSentenceEnder(textContent, offset - 3, 'backward');
        if (previousSentenceEnd !== null) {
          const newRange = document.createRange();
          newRange.setStart(textNode, previousSentenceEnd);
          newRange.setEnd(range.endContainer, range.endOffset);
          return newRange;
        } else {
          const newRange = document.createRange();
          newRange.setStart(textNode, 0);
          newRange.setEnd(range.endContainer, range.endOffset);
          return newRange;
        }
      }
    }
  } else {
    const newOffset = findNextSentenceEnder(textContent, offset, 'forward');
    if (newOffset !== null && newOffset > offset) {
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(textNode, newOffset);
      return newRange;
    } else if (newOffset === null) {
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(textNode, textContent.length);
      return newRange;
    }
  }
  
  return null;
}

export function shortenSentenceBoundary(range: Range | null, boundary: 'start' | 'end'): Range | null {
  if (!range) return null;
  
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  const MIN_TEXT_LENGTH = 5;
  
  if (boundary === 'start') {
    if (startContainer.nodeType !== Node.TEXT_NODE) return null;
    
    const textNode = startContainer as Text;
    const textContent = textNode.textContent || '';
    const sentenceEnders = /[.!?]+\s+/g;
    let match: RegExpExecArray | null;
    
    while ((match = sentenceEnders.exec(textContent)) !== null) {
      const matchEnd = match.index + match[0].length;
      if (matchEnd > startOffset && matchEnd < endOffset) {
        const remainingLength = endOffset - matchEnd;
        if (remainingLength >= MIN_TEXT_LENGTH) {
          const newRange = document.createRange();
          newRange.setStart(textNode, matchEnd);
          newRange.setEnd(endContainer, endOffset);
          return newRange;
        }
      }
    }
  } else {
    if (endContainer.nodeType !== Node.TEXT_NODE) return null;
    
    const textNode = endContainer as Text;
    const textContent = textNode.textContent || '';
    const sentenceEnders = /[.!?]+\s+/g;
    let match: RegExpExecArray | null;
    const matches: number[] = [];
    
    while ((match = sentenceEnders.exec(textContent)) !== null) {
      const matchEnd = match.index + match[0].length;
      if (matchEnd < endOffset && matchEnd > startOffset) {
        matches.push(matchEnd);
      }
    }
    
    if (matches.length > 0) {
      const newOffset = matches[matches.length - 1];
      const remainingLength = newOffset - startOffset;
      if (remainingLength >= MIN_TEXT_LENGTH) {
        const newRange = document.createRange();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(textNode, newOffset);
        return newRange;
      }
    }
  }
  
  return null;
}

export interface CompleteSentenceResult {
  selectedRanges: Range[];
  sentenceRange: Range | null;
}

export function getCompleteSentence(): CompleteSentenceResult {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.toString().trim() === '') {
    return { selectedRanges: [], sentenceRange: null };
  }
  
  const selectedRanges: Range[] = [];
  const fullSelectionText = selection.toString().trim();
  
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    if (range.toString().trim()) {
      selectedRanges.push(range.cloneRange());
    }
  }
  
  if (selectedRanges.length === 0) {
    return { selectedRanges: [], sentenceRange: null };
  }
  
  const primaryRange = selectedRanges[0];
  let startContainer: Node = primaryRange.startContainer;
  let endContainer: Node = primaryRange.endContainer;
  
  if (startContainer.nodeType !== Node.TEXT_NODE) {
    startContainer = getFirstTextNode(startContainer) || startContainer;
  }
  if (endContainer.nodeType !== Node.TEXT_NODE) {
    endContainer = getLastTextNode(endContainer) || endContainer;
  }
  
  if (startContainer.nodeType !== Node.TEXT_NODE || endContainer.nodeType !== Node.TEXT_NODE) {
    return { selectedRanges, sentenceRange: null };
  }
  
  let container: Node | Element | null = primaryRange.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    container = (container as Text).parentElement;
  }
  
  while (container && container instanceof Element && !isBlockElement(container) && container.parentElement) {
    container = container.parentElement;
  }
  
  if (!container) {
    return { selectedRanges, sentenceRange: null };
  }
  
  const fullText = (container as Element).textContent || '';
  const completeSentence = extractSentenceContaining(fullText, fullSelectionText);
  
  if (completeSentence && completeSentence.trim() !== fullSelectionText.trim()) {
    const sentenceRange = document.createRange();
    const textNodes = getTextNodesIn(container as Element);
    let sentenceStart: { node: Text; offset: number } | null = null;
    let sentenceEnd: { node: Text; offset: number } | null = null;
    
    const normalizedFullText = fullText.replace(/\s+/g, ' ');
    const normalizedSentence = completeSentence.replace(/\s+/g, ' ');
    const sentenceStartInFull = normalizedFullText.indexOf(normalizedSentence);
    
    if (sentenceStartInFull === -1) {
      return { selectedRanges, sentenceRange: primaryRange.cloneRange() };
    }
    
    const sentenceEndInFull = sentenceStartInFull + normalizedSentence.length;
    let normalizedOffset = 0;
    
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const normalizedNodeText = nodeText.replace(/\s+/g, ' ');
      const normalizedNodeLength = normalizedNodeText.length;
      
      if (sentenceStart === null && normalizedOffset + normalizedNodeLength > sentenceStartInFull) {
        const offsetInNormalized = sentenceStartInFull - normalizedOffset;
        const offsetInOriginal = mapNormalizedToOriginal(nodeText, offsetInNormalized);
        sentenceStart = { node: textNode, offset: offsetInOriginal };
      }
      
      if (sentenceStart !== null && sentenceEnd === null && normalizedOffset + normalizedNodeLength >= sentenceEndInFull) {
        const offsetInNormalized = sentenceEndInFull - normalizedOffset;
        const offsetInOriginal = mapNormalizedToOriginal(nodeText, offsetInNormalized);
        sentenceEnd = { node: textNode, offset: offsetInOriginal };
        break;
      }
      
      normalizedOffset += normalizedNodeLength;
    }
    
    if (sentenceStart && sentenceEnd) {
      sentenceRange.setStart(sentenceStart.node, sentenceStart.offset);
      sentenceRange.setEnd(sentenceEnd.node, sentenceEnd.offset);
      return { selectedRanges, sentenceRange };
    }
  }
  
  return { selectedRanges, sentenceRange: primaryRange.cloneRange() };
}

export function mapSidePanelSelectionToSentenceRange(
  sidePanelContainer: HTMLElement,
  originalSentenceRange: Range
): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const sidePanelRange = selection.getRangeAt(0);
  if (!sidePanelContainer.contains(sidePanelRange.commonAncestorContainer)) {
    return null;
  }

  const selectedText = sidePanelRange.toString().trim();
  
  if (!selectedText) {
    return null;
  }

  const originalSentenceText = extractTextFromRange(originalSentenceRange);
  
  const normalizedSentence = originalSentenceText.replace(/\s+/g, ' ').trim();
  const normalizedSelected = selectedText.replace(/\s+/g, ' ');

  const matchIndex = normalizedSentence.toLowerCase().indexOf(normalizedSelected.toLowerCase());
  if (matchIndex === -1) {
    return null;
  }

  const startOffsetNormalized = matchIndex;
  const endOffsetNormalized = matchIndex + normalizedSelected.length;

  const containerElement = originalSentenceRange.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? (originalSentenceRange.commonAncestorContainer as Element)
    : originalSentenceRange.commonAncestorContainer.parentElement;

  if (!containerElement) {
    return null;
  }

  const textNodes = getTextNodesIn(containerElement);
  const rangeTextNodes = textNodes.filter(node => originalSentenceRange.intersectsNode(node));

  if (rangeTextNodes.length === 0) {
    return null;
  }

  let normalizedPosition = 0;
  let resultStart: { node: Text; offset: number } | null = null;
  let resultEnd: { node: Text; offset: number } | null = null;
  let wasWhitespace = true;

  for (const node of rangeTextNodes) {
    const nodeText = node.textContent || '';

    for (let i = 0; i < nodeText.length; i++) {
      const char = nodeText[i];
      const isWhitespace = /\s/.test(char);

      if (normalizedPosition === startOffsetNormalized && resultStart === null) {
        resultStart = { node, offset: i };
      }

      if (normalizedPosition === endOffsetNormalized && resultEnd === null) {
        resultEnd = { node, offset: i };
        break;
      }

      if (isWhitespace) {
        if (!wasWhitespace) {
          normalizedPosition++;
          wasWhitespace = true;
        }
      } else {
        if (wasWhitespace) {
          wasWhitespace = false;
        }
        normalizedPosition++;
      }
    }

    if (resultEnd) {
      break;
    }

    if (normalizedPosition === endOffsetNormalized && resultEnd === null) {
      resultEnd = { node, offset: nodeText.length };
    }
  }

  if (!resultStart || !resultEnd) {
    return null;
  }

  const resultRange = document.createRange();
  resultRange.setStart(resultStart.node, resultStart.offset);
  resultRange.setEnd(resultEnd.node, resultEnd.offset);
  
  return resultRange;
}

