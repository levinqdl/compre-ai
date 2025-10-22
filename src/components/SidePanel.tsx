/// <reference types="chrome" />
import { useState } from 'react';
import SentenceControls from './SentenceControls';

interface TranslationResult {
  translation: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  model?: string;
  explanations?: Array<{ text: string; explanation: string }>;
}

interface SidePanelProps {
  selectedText: string | string[];
  sentenceText: string;
  highlightedSentence: string;
  showSentence: boolean;
  onClose: () => void;
  onTranslate: () => Promise<{ success: boolean; translation?: string; error?: string; detectedLanguage?: string; targetLanguage?: string; model?: string; explanations?: any[] }>;
  onExpandSentenceStart?: () => void;
  onShortenSentenceStart?: () => void;
  onExpandSentenceEnd?: () => void;
  onShortenSentenceEnd?: () => void;
}

export default function SidePanel({
  selectedText,
  sentenceText,
  highlightedSentence,
  showSentence,
  onClose,
  onTranslate,
  onExpandSentenceStart,
  onShortenSentenceStart,
  onExpandSentenceEnd,
  onShortenSentenceEnd
}: SidePanelProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayText = Array.isArray(selectedText)
    ? selectedText.join(' • ')
    : selectedText;

  const handleTranslate = async () => {
    setIsTranslating(true);
    setResult(null);
    setError(null);

    try {
      const response = await onTranslate();
      if (response.success && response.translation) {
        setResult({
          translation: response.translation,
          detectedLanguage: response.detectedLanguage,
          targetLanguage: response.targetLanguage,
          model: response.model,
          explanations: response.explanations
        });
      } else {
        setError(response.error || 'Translation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation service error');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed top-0 right-0 w-96 h-screen bg-white border-l-2 border-gray-200 shadow-2xl z-[2147483647] font-sans overflow-y-auto animate-slide-in">
      <div className="sticky top-0 z-10 px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="m-0 text-gray-800 text-base font-semibold">Compre AI Translator</h3>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-2xl cursor-pointer text-gray-600 p-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200"
          title="Close"
        >
          ×
        </button>
      </div>

      <div className="p-5">
        {showSentence && (
          <div className="mb-5">
            <label className="block mb-2 font-semibold text-gray-800">Complete Sentence:</label>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-gray-800 leading-relaxed break-words max-h-40 overflow-y-auto">
              <SentenceControls
                highlightedSentence={highlightedSentence}
                onExpandSentenceStart={onExpandSentenceStart}
                onShortenSentenceStart={onShortenSentenceStart}
                onExpandSentenceEnd={onExpandSentenceEnd}
                onShortenSentenceEnd={onShortenSentenceEnd}
              />
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-800">Selected Text:</label>
          <div className="bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 leading-normal break-words max-h-32 overflow-y-auto">
            {displayText}
          </div>
        </div>

        <div className="mb-5 text-center">
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-md cursor-pointer text-sm font-semibold transition-colors hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px] h-auto"
          >
            {isTranslating ? (
              <span className="inline-block animate-spin">⟳</span>
            ) : (
              `Translate ${showSentence ? 'Sentence' : 'Text'}`
            )}
          </button>
        </div>

        {result && (
          <div className="mb-5">
            <label className="block mb-2 font-semibold text-gray-800">Translation:</label>
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-gray-800 leading-normal break-words mb-2">
              {result.translation}
            </div>
            {(result.detectedLanguage || result.targetLanguage) && (
              <div className="text-xs text-gray-600 mb-2.5">
                {result.detectedLanguage && result.detectedLanguage.toLowerCase() !== 'unknown' && (
                  <span>Detected: {result.detectedLanguage}</span>
                )}
                {result.detectedLanguage && result.targetLanguage && ' • '}
                {result.targetLanguage && <span>Target: {result.targetLanguage}</span>}
              </div>
            )}
            {result.explanations && result.explanations.length > 0 && (
              <div className="mt-3">
                <label className="block mb-1.5 font-semibold text-gray-800">Explanations:</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-gray-800 leading-normal break-words">
                  {result.explanations.map((item, index) => (
                    <div
                      key={index}
                      className={`mb-3 pb-3 ${index < result.explanations!.length - 1 ? 'border-b border-gray-200' : ''}`}
                    >
                      {item.text && (
                        <div className="font-semibold mb-1 text-compre-purple-500">
                          "{item.text}"
                        </div>
                      )}
                      {item.explanation && (
                        <div className="text-gray-600 leading-relaxed">
                          {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.model && (
              <div className="mt-2.5 text-xs text-gray-600">Model: {result.model}</div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5">
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 leading-normal">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
