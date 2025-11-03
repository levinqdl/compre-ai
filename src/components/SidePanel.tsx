/// <reference types="chrome" />
import { useState, useRef, useCallback, useEffect } from 'react';
import { PanelLeftClose, PanelRightClose, PanelBottomClose } from 'lucide-react';
import SentenceControls from './SentenceControls';

interface TranslationResult {
  translation: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  model?: string;
  explanations?: Array<{ text: string; explanation: string }>;
}

type PanelPosition = 'left' | 'right' | 'bottom';

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
  onSentenceSelection?: (container: HTMLElement) => void;
  onPositionChange?: (position: PanelPosition) => void;
  position?: PanelPosition;
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
  onShortenSentenceEnd,
  onSentenceSelection,
  onPositionChange,
  position = 'right'
}: SidePanelProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>(position);
  const sentenceContainerRef = useRef<HTMLDivElement>(null);

  const displayText = Array.isArray(selectedText)
    ? selectedText.join(' • ')
    : selectedText;

  const handleSentenceMouseUp = useCallback(() => {
    if (sentenceContainerRef.current && onSentenceSelection) {
      onSentenceSelection(sentenceContainerRef.current);
    }
  }, [onSentenceSelection]);

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

  const handlePositionChange = (newPosition: PanelPosition) => {
    setPanelPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  const getPositionClasses = () => {
    switch (panelPosition) {
      case 'left':
        return 'left-0 top-0 w-96 h-screen border-r-2 animate-slide-in-left';
      case 'bottom':
        return 'bottom-0 left-0 right-0 w-full h-96 border-t-2 animate-slide-in-bottom';
      case 'right':
      default:
        return 'right-0 top-0 w-96 h-screen border-l-2 animate-slide-in-right';
    }
  };
  
  const positionClasses = getPositionClasses();
  
  const renderPositionToggle = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
      <button
        onClick={() => handlePositionChange('left')}
        className={`p-1.5 rounded transition-colors ${
          panelPosition === 'left' 
            ? 'bg-white shadow text-blue-600' 
            : 'bg-transparent text-gray-600 hover:bg-gray-200'
        }`}
        title="Left"
      >
        <PanelLeftClose size={16} />
      </button>
      <button
        onClick={() => handlePositionChange('bottom')}
        className={`p-1.5 rounded transition-colors ${
          panelPosition === 'bottom' 
            ? 'bg-white shadow text-blue-600' 
            : 'bg-transparent text-gray-600 hover:bg-gray-200'
        }`}
        title="Bottom"
      >
        <PanelBottomClose size={16} />
      </button>
      <button
        onClick={() => handlePositionChange('right')}
        className={`p-1.5 rounded transition-colors ${
          panelPosition === 'right' 
            ? 'bg-white shadow text-blue-600' 
            : 'bg-transparent text-gray-600 hover:bg-gray-200'
        }`}
        title="Right"
      >
        <PanelRightClose size={16} />
      </button>
    </div>
  );

  return (
    <div className={`compre-ai-side-panel flex flex-col fixed bg-white border-gray-200 shadow-2xl z-[2147483647] font-sans overflow-y-auto ${positionClasses}`}>
      <div className="sticky top-0 z-10 px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="m-0 text-gray-800 text-base font-semibold">Compre AI Translator</h3>
        <div className="flex items-center gap-2">
          {panelPosition === 'bottom' && renderPositionToggle()}
          <button
            onClick={onClose}
            className="bg-transparent border-none text-2xl cursor-pointer text-gray-600 p-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-5 flex-1">
        {showSentence && (
          <div className="mb-5">
            <label className="block mb-2 font-semibold text-gray-800">Complete Sentence:</label>
            <div 
              ref={sentenceContainerRef}
              onMouseUp={handleSentenceMouseUp}
              className="compre-ai-sentence-selectable bg-blue-50 border border-blue-200 rounded-md p-3 text-gray-800 leading-relaxed break-words max-h-40 overflow-y-auto">
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
            className="bg-blue-600 text-white border-none px-6 py-2.5 rounded-md cursor-pointer text-sm font-semibold transition-colors hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px] h-[38px] flex items-center justify-center mx-auto"
          >
            {isTranslating ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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
                          {item.text}
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

      {(panelPosition === 'left' || panelPosition === 'right') && (
        <div className="sticky bottom-0 z-10 px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-center">
          {renderPositionToggle()}
        </div>
      )}
    </div>
  );
}
