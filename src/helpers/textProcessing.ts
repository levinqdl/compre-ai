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

  const sentenceEnders = /[.!?]+(?:\s|$)/g;
  const sentences: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = sentenceEnders.exec(cleanText)) !== null) {
    const sentence = cleanText.substring(lastIndex, match.index + match[0].length).trim();
    if (sentence) sentences.push({ text: sentence, startIndex: lastIndex, endIndex: match.index + match[0].length });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleanText.length) {
    const lastSentence = cleanText.substring(lastIndex).trim();
    if (lastSentence) sentences.push({ text: lastSentence, startIndex: lastIndex, endIndex: cleanText.length });
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

export function highlightSelectedInSentence(sentence: Selectable, selectedText: Selectable | Selectable[]): string {
  const extractText = (input: Selectable | undefined | null): string => {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (typeof (input as any).toString === 'function') return (input as any).toString();
    return '';
  };
  const sentenceStr = extractText(sentence);
  if (!sentenceStr) return escapeHtml('');
  if (!selectedText || (Array.isArray(selectedText) && selectedText.length === 0)) return escapeHtml(sentenceStr);

  let escapedSentence = escapeHtml(sentenceStr);
  const textArray = Array.isArray(selectedText) ? selectedText : [selectedText];
  textArray.forEach((text) => {
    const textStr = extractText(text);
    if (textStr && textStr.trim()) {
      const escapedSelected = escapeHtml(textStr);
      const regex = new RegExp(escapedSelected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      escapedSentence = escapedSentence.replace(regex, '<mark style="background-color: #fff3cd; padding: 1px 2px; border-radius: 2px;">$&</mark>');
    }
  });
  return escapedSentence;
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
