// @ts-check

// Each line holds one full sentence. The rule reports a line that starts a
// second sentence, and a line before the last in a paragraph that does not
// end at a sentence boundary. The last line may be a fragment without a full
// stop.

// These types cover the part of the markdownlint API that the rule uses,
// because the repo does not install markdownlint. An inline token always has
// a map.
/**
 * @typedef {{ type: string, map: [number, number] }} Token
 * @typedef {{
 *   lines: string[],
 *   parsers: { markdownit: { tokens: Token[] } },
 * }} RuleParams
 * @typedef {(info: {
 *   lineNumber: number,
 *   detail?: string,
 *   context?: string,
 * }) => void} OnError
 */

// Words whose full stop is an abbreviation rather than a sentence end.
const ABBREVIATIONS = new Set([
  "e.g.",
  "i.e.",
  "etc.",
  "vs.",
  "cf.",
  "al.",
  "fig.",
  "no.",
]);

// A full stop, question or exclamation mark, plus any closing quotes or
// brackets that belong to the same sentence.
const BOUNDARY = /[.?!]["'’)\]`]*/g;

const HARD_BREAK = /(\s\s|\\)$/;

// Spans whose punctuation is not prose: `code`, ](destination), <autolink>,
// and bare URLs. Masked to same-length filler so column offsets survive.
const MASKED = [/`+[^`]*`+/g, /\]\([^)]*\)/g, /<[^ >]+>/g, /\bhttps?:\/\/\S+/g];

// Matches the blockquote arrows and list marker at the start of a line,
// because a marker such as "1." looks like a sentence end.
const LEADING_MARKERS = /^[\s>]*(?:[-*+]\s+|\d+[.)]\s+)?/;

/** @param {string} line */
function mask(line) {
  let masked = line;
  for (const pattern of MASKED) {
    masked = masked.replace(pattern, (match) => "x".repeat(match.length));
  }
  return masked.replace(LEADING_MARKERS, (match) => " ".repeat(match.length));
}

// True when the full stop at index belongs to an abbreviation, an initial or
// an ellipsis.
/**
 * @param {string} text
 * @param {number} index
 */
function isFalseBoundary(text, index) {
  if (text[index] !== ".") {
    return false;
  }
  if (text[index - 1] === "." || text[index + 1] === ".") {
    return true;
  }

  const before = text.slice(0, index + 1);
  const word = (/[A-Za-z.]+$/.exec(before) || [""])[0];

  return ABBREVIATIONS.has(word.toLowerCase()) || /^[A-Z]\.$/.test(word);
}

// Returns the offset just past each sentence boundary on the line.
/** @param {string} text */
function boundaries(text) {
  const ends = [];

  BOUNDARY.lastIndex = 0;
  let match;
  while ((match = BOUNDARY.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const next = text[end];
    // Whitespace or the line end must follow, which rules out "2.0" and
    // "README.md".
    if (
      (next === undefined || /\s/.test(next)) &&
      !isFalseBoundary(text, match.index)
    ) {
      ends.push(end);
    }
  }

  return ends;
}

/**
 * @param {string} line
 * @param {number} from
 */
function snippet(line, from) {
  return line.slice(Math.max(0, from - 30), from).trimStart() || line.trim();
}

/**
 * @param {string[]} lines
 * @param {number} startLine
 * @param {OnError} onError
 */
function checkParagraph(lines, startLine, onError) {
  lines.forEach((line, offset) => {
    const lineNumber = startLine + offset;
    const masked = mask(line);
    const ends = boundaries(masked);
    const last = offset === lines.length - 1;

    for (const end of ends) {
      if (masked.slice(end).trim() !== "") {
        onError({
          lineNumber,
          "detail": "Second sentence starts on the same line",
          "context": snippet(line, end),
        });
        break;
      }
    }

    if (last || HARD_BREAK.test(line)) {
      return;
    }

    const trimmed = masked.trimEnd();
    // A line with a single word, such as a long URL, cannot be broken.
    if (!/\s/.test(trimmed.trim())) {
      return;
    }
    if (!ends.includes(trimmed.length)) {
      onError({
        lineNumber,
        "detail": "Line ends mid-sentence; break at sentence boundaries only",
        "context": snippet(line, line.trimEnd().length),
      });
    }
  });
}

const rule = {
  "names": ["sentence-per-line"],
  "description": "Each line holds exactly one sentence",
  "tags": ["whitespace", "prose"],
  "parser": "markdownit",
  // fixInfo is left out because prose is rewrapped by hand.
  /**
   * @param {RuleParams} params
   * @param {OnError} onError
   */
  "function": (params, onError) => {
    const { tokens } = params.parsers.markdownit;

    tokens.forEach((token, index) => {
      if (
        token.type !== "inline" ||
        tokens[index - 1].type !== "paragraph_open"
      ) {
        return;
      }
      const [start, end] = token.map;
      checkParagraph(params.lines.slice(start, end), start + 1, onError);
    });
  },
};

export default rule;
