interface SentenceControlsProps {
  highlightedSentence: string;
  onExpandSentenceStart?: () => void;
  onShortenSentenceStart?: () => void;
  onExpandSentenceEnd?: () => void;
  onShortenSentenceEnd?: () => void;
}

export default function SentenceControls({
  highlightedSentence,
  onExpandSentenceStart,
  onShortenSentenceStart,
  onExpandSentenceEnd,
  onShortenSentenceEnd
}: SentenceControlsProps) {
  return (
    <div>
      <span className="inline-flex gap-1 mr-1 select-none">
        <span 
          onClick={onExpandSentenceStart} 
          title="Expand sentence at start" 
          className="inline-block text-blue-300 cursor-pointer transition-transform hover:scale-125 text-lg"
        >
          ‹
        </span>
        <span 
          onClick={onShortenSentenceStart} 
          title="Shorten sentence at start" 
          className="inline-block text-blue-300 cursor-pointer transition-transform hover:scale-125 text-lg"
        >
          ›
        </span>
      </span>
      <span
        dangerouslySetInnerHTML={{ __html: highlightedSentence }}
      />
      <span className="inline-flex gap-1 ml-1">
        <span 
          onClick={onShortenSentenceEnd} 
          title="Shorten sentence at end" 
          className="inline-block text-blue-300 cursor-pointer transition-transform hover:scale-125 text-lg"
        >
          ‹
        </span>
        <span 
          onClick={onExpandSentenceEnd} 
          title="Expand sentence at end" 
          className="inline-block text-blue-300 cursor-pointer transition-transform hover:scale-125 text-lg"
        >
          ›
        </span>
      </span>
    </div>
  );
}
