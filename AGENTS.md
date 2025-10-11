# Agent Instructions for Compre AI Development

> This file follows the [agents.md](https://agents.md/) specification for AI coding assistants.

## Project Overview

Compre AI is a Chrome extension for text translation with intelligent sentence detection and context-aware text accumulation. It uses DOM Range objects for precise text selection and provides real-time translation with highlighted sentence context.

## Core Architecture

### Technology Stack
- Runtime: Chrome Extension (Manifest V3)
- Language: TypeScript for helpers and integration scripts (compiled to JS)
- Bundler: Vite (outputs IIFE bundles in dist/)
- Testing: Vitest (TS/JS)
- Architecture: Content Script + Background Service Worker + Popup

### Key Files
- dist/content.js - Content script bundle (from src/content.ts)
- dist/background.js - Service worker bundle (from src/background.ts)
- dist/popup.js - Popup bundle (from src/popup.ts)
- src/helpers/textProcessing.ts - Pure, typed helper functions (also kept as .js for tests/compat)
- test/*.test.js - Vitest suites

## Development Guidelines

### 1. Code Style

**General Principles:**
- Write clear, self-explanatory code
- **NO comments to explain changes** - code should be self-documenting
- Use descriptive variable and function names
- Keep functions small and focused on single responsibility

**Function Naming:**
```javascript
// ✅ Good - Clear purpose
function extractTextFromRange(range) { }
function isSameSentenceRange(range1, range2) { }
function mapNormalizedToOriginal(text, offset) { }

// ❌ Bad - Unclear purpose
function process(data) { }
function handle(x) { }
```

### 2. DOM Range Usage

**Always use Range objects for text selection:**
```javascript
// ✅ Correct - Use Range objects internally
const { selectedRanges, sentenceRange } = getCompleteSentence();
const text = extractTextFromRange(sentenceRange);

// ❌ Wrong - Don't use string-based selection
const text = window.getSelection().toString();
```

**Key Functions:**
- `getCompleteSentence()` - Returns `{ selectedRanges: Range[], sentenceRange: Range }`
- `extractTextFromRange(range)` - Converts Range to string
- `findSentenceRangeContaining(textNode, start, end)` - Finds sentence boundaries
- `createRangeFromOffsets(textNode, start, end)` - Creates Range from offsets

### 3. Sentence Detection

**Always use block-level container approach:**
```javascript
// ✅ Correct - Get full container text
let container = range.commonAncestorContainer;
if (container.nodeType === Node.TEXT_NODE) {
 **Runtime**: Chrome Extension (Manifest V3)
 **Language**: TypeScript for helpers + JavaScript for integration (migrating incrementally)
 **Testing**: Vitest (TS/JS)
}
const fullText = container.textContent || '';
 `src/helpers/textProcessing.ts` - Pure, typed helper functions for text processing (compiled to `src/helpers/textProcessing.js`)
- Normalize whitespace: `text.replace(/\s+/g, ' ')`
- Map positions: `mapNormalizedToOriginal(text, offset)`

### 4. Text Accumulation

**Context-aware accumulation:**
  currentSentenceRange = sentenceRange;
}
```


### 5. Testing Requirements

**All changes must include tests:**
```javascript
describe('Feature name', () => {
  beforeEach(() => {
    // Setup DOM
  });

  it('should handle specific case', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

**Run tests before committing:**
```bash
pnpm test
```

**Test coverage requirements:**
- All new functions must have tests
- Edge cases must be covered
- HTML/DOM interactions must be tested


**Example:**
```javascript
export function highlightSelectedInSentence(sentence, selectedText) {
  // Accept both Range and string
  const sentenceStr = extractText(sentence);
  const textArray = Array.isArray(selectedText) ? selectedText : [selectedText];
  
  // Process...
  return result;
}
```

### 7. UI Updates

**Side panel updates:**
- Always check if element exists before updating
- Use `style.display` to show/hide elements (don't remove from DOM)
- Update button text dynamically based on context
- Handle nulls gracefully

**Example:**
```javascript
if (sentenceContainer) {
  sentenceContainer.style.display = showSentence ? 'block' : 'none';
}
```

### 8. Translation API

**Request payload format:**
```javascript
{
  text: ['word1', 'word2'],  // Array of selected texts
  completeSentence: 'The complete sentence.',
  to: 'zh',  // Target language
  detect_source: true
}
```

**Response handling:**
```javascript
{
  translation: 'Translated text',
  explanations: [
    { text: 'word1', explanation: 'Explanation for word1' }
  ],
  detectedLanguage: 'en',
  targetLanguage: 'zh',
  model: 'gpt-4'
}
```

## Documentation Guidelines

### When to Document

**Always document in README.md or AGENTS.md:**
- New features or major changes
- Architecture decisions
- API changes
- Breaking changes
- Bug fixes that affect behavior

**Update this file (AGENTS.md) when:**
- Adding new coding patterns
- Changing architecture
- Adding new testing requirements
- Modifying development workflow

### How to Document

**In README.md:**
- Focus on user-facing features
- Include examples and use cases
- Keep it concise and organized
- Use emojis for visual appeal

**In AGENTS.md (this file):**
- Focus on implementation details
- Include code examples
- Explain the "why" behind decisions
- Provide clear guidelines for AI assistants

**DON'T create separate .md files:**
- Consolidate documentation into README.md or AGENTS.md
- Remove redundant documentation files after consolidation
- Keep documentation in sync with code

## Common Patterns

### Pattern 1: Adding a New Feature

1. **Plan**: Break down into small, testable functions
2. **Implement**: Write helper functions first, then integration
3. **Test**: Write tests for all new functions
4. **Document**: Update README.md with user-facing info
5. **Update AGENTS.md**: Add new patterns or guidelines if needed

### Pattern 2: Fixing a Bug

1. **Reproduce**: Write a failing test first
2. **Debug**: Identify root cause (don't just patch symptoms)
3. **Fix**: Implement minimal fix that solves root cause
4. **Verify**: Ensure all tests pass (31+ tests)
5. **Document**: Update README.md if behavior changed

### Pattern 3: Refactoring

1. **Tests first**: Ensure full test coverage before refactoring
2. **Small steps**: Make incremental changes
3. **Test continuously**: Run tests after each change
4. **Update docs**: Keep AGENTS.md in sync with new patterns

## Technical Decisions

### Why DOM Ranges?
- **Accuracy**: Direct DOM manipulation, no string searching
- **Performance**: Native browser APIs, optimized
- **Robustness**: Handles complex HTML structures
- **Context**: Maintains selection context across operations

### Why Sentence-Aware Accumulation?
- **User Intent**: Users think in sentences, not fragments
- **Translation Quality**: Full sentence context improves accuracy
- **User Experience**: Predictable behavior, no confusion

### Why Block-Level Container Approach?
- **Completeness**: Captures full sentence across inline elements
- **Reliability**: Works with any HTML structure
- **Consistency**: Same behavior regardless of complexity

## Debugging Tips

### Common Issues

**Issue**: Sentence not extracted fully
- **Check**: Is the container a block-level element?
- **Check**: Are all text nodes collected with `getTextNodesIn()`?
- **Check**: Is whitespace normalized properly?

**Issue**: Text accumulation not resetting
- **Check**: Is `isSameSentenceRange()` working correctly?
- **Check**: Is `currentSentenceRange` being updated?
- **Check**: Are ranges being compared with `compareBoundaryPoints()`?

**Issue**: Tests failing
- **Check**: Is DOM properly set up in `beforeEach()`?
- **Check**: Are you testing the right thing?
- **Check**: Is cleanup happening in `afterEach()`?

### Debugging Commands

```bash
# Install deps
pnpm install

# Build extension (bundled to dist/)
pnpm run build

# Run all tests
pnpm test

# Run specific test file
pnpm test test/textProcessing.test.js

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

## Recent Changes Summary

### October 2025 - Major Refactoring

**1. Range-Based Text Selection**
- Migrated from string-based to Range-based selection
- Added helper functions for Range manipulation
- Improved accuracy and performance

**2. Sentence-Aware Text Accumulation**
- Added automatic reset when switching sentences
- Implemented Range comparison logic
- Enhanced user experience with context-aware behavior

**3. HTML Sentence Extraction Fix**
- Fixed bug where sentences were cut at inline elements
- Removed flawed single-node optimization
- Added proper whitespace normalization
- Created position mapping function

**4. Complete Sentence Display Fix**
- Fixed visibility logic for sentence container
- Made container always present in DOM
- Added dynamic show/hide based on context

**5. Function Extraction & Testing (October 2025)**
- **Extracted `getCompleteSentence` function** from content script to `src/helpers/textProcessing.ts`
- **Added comprehensive test coverage** with 25 new tests in `test/getCompleteSentence.test.js`
- **Modularized helper functions**: `mapNormalizedToOriginal`, `getFirstTextNode`, `getLastTextNode`, `getTextNodesIn`, `isBlockElement`
- **Improved maintainability** by separating concerns and making functions testable
- **Total test count**: 56 tests across 4 test files
- **Enhanced code quality** with proper TypeScript types and interfaces

### October 2025 - TypeScript + Vite Adoption

- Introduced TypeScript across helpers and integration (`src/*.ts`)
- Adopted Vite bundling to produce MV3-compatible IIFE bundles in `dist/`
- Content script now statically imports helpers; no dynamic import required
- Packaging scripts copy manifest, popup.html, icons, config.js into `dist/`

## Quick Reference

### Must-Have Checks Before Committing

- [ ] All tests pass (`pnpm test`)
- [ ] No ESLint errors
- [ ] Code is self-documenting (no explanation comments)
- [ ] New features have tests
- [ ] README.md updated (if user-facing change)
- [ ] AGENTS.md updated (if pattern/guideline change)

### File Organization

```
compre-ai/
├── content.js                    # Main content script
├── src/helpers/
│   ├── textProcessing.ts        # Pure typed helper functions (source)
│   └── textProcessing.js        # Compiled output used by extension
├── test/
│   ├── textProcessing.test.js   # Helper function tests
│   ├── sentenceRangeComparison.test.js
│   ├── htmlSentenceExtraction.test.js
│   └── getCompleteSentence.test.js  # Complete sentence detection tests
├── README.md                     # User documentation
├── AGENTS.md                     # This file (AI assistant guide)
└── docs/                        # Reserved for future detailed docs
```

### Key Metrics

- **Tests**: 56 passing
- **Test Files**: 4
- **Coverage**: Core functions 100%
- **Browser**: Chrome (Manifest V3)

---

## Final Notes for AI Assistants

1. **Always read this file first** before making changes
2. **Follow the patterns** established in this document
3. **Write tests** for everything
4. **Keep documentation updated** in README.md or this file
5. **Don't create new .md files** - consolidate here
6. **Code quality > Speed** - take time to do it right
7. **Ask clarifying questions** if requirements are unclear

Remember: The goal is maintainable, testable, well-documented code that provides excellent user experience.
