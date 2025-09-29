// Pure helper functions extracted from content.js for testing

export function isBlockElementTag(tagName) {
  if (!tagName) return false;
  const blockElements = [
    'P','DIV','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','LI','TD','TH','ARTICLE','SECTION','ASIDE','NAV','MAIN','HEADER','FOOTER'
  ];
  return blockElements.includes(tagName.toUpperCase());
}

export function extractSentenceContaining(fullText, selectedText) {
  if (!fullText || !selectedText) return selectedText || '';
  const cleanText = fullText.replace(/\s+/g, ' ').trim();
  const cleanSelected = selectedText.replace(/\s+/g, ' ').trim();
  const selectedIndex = cleanText.toLowerCase().indexOf(cleanSelected.toLowerCase());
  if (selectedIndex === -1) return selectedText;
  const sentenceEnders = /[.!?]+(?:\s|$)/g;
  const sentences = [];
  let match; let lastIndex = 0;
  while ((match = sentenceEnders.exec(cleanText)) !== null) {
    const sentence = cleanText.substring(lastIndex, match.index + match[0].length).trim();
    if (sentence) {
      sentences.push({ text: sentence, startIndex: lastIndex, endIndex: match.index + match[0].length });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleanText.length) {
    const lastSentence = cleanText.substring(lastIndex).trim();
    if (lastSentence) {
      sentences.push({ text: lastSentence, startIndex: lastIndex, endIndex: cleanText.length });
    }
  }
  for (const sentence of sentences) {
    if (selectedIndex >= sentence.startIndex && selectedIndex < sentence.endIndex) {
      return sentence.text;
    }
  }
  const selectedEnd = selectedIndex + cleanSelected.length;
  for (const sentence of sentences) {
    if (selectedIndex < sentence.endIndex && selectedEnd > sentence.startIndex) {
      return sentence.text;
    }
  }
  return selectedText;
}

export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightSelectedInSentence(sentence, selectedText) {
  if (!sentence || !selectedText) return escapeHtml(sentence || '');
  const escapedSentence = escapeHtml(sentence);
  const escapedSelected = escapeHtml(selectedText);
  const regex = new RegExp(escapedSelected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return escapedSentence.replace(regex, '<mark style="background-color: #fff3cd; padding: 1px 2px; border-radius: 2px;">$&</mark>');
}
