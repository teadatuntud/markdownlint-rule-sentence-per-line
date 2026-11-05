// @ts-check

// Each line holds one full sentence. The rule reports a line that starts a
// second sentence, and a line before the last in a paragraph that does not
// end at a sentence boundary. The last line may be a fragment without a full
// stop.

// These types cover the part of the markdownlint API that the rule uses, so
// the package does not depend on markdownlint. An inline token always has a
// map.
/**
 * @typedef {{ type: string, map: [number, number] }} Token
 * @typedef {{
 *   lines: string[],
 *   parsers: { markdownit: { tokens: Token[] } },
 *   config: { abbreviations?: string[] },
 * }} RuleParams
 * @typedef {(info: {
 *   lineNumber: number,
 *   detail?: string,
 *   context?: string,
 * }) => void} OnError
 */

// A full stop after these does not end a sentence, so a sentence that really
// ends in one is missed. Only list words that are rarely anything else.
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

// Matches sentence punctuation and any closing quotes, brackets or emphasis
// markers after it.
const BOUNDARY = /[.?!]["'’)\]`*_]*/g;

// A sentence may continue after a backslash hard break. Two trailing spaces
// are not accepted, because they are invisible in the source.
const HARD_BREAK = /\\$/;

// Code spans, link destinations, autolinks and bare URLs become filler of the
// same length, so columns stay correct. A link destination becomes spaces, so
// a full stop at the end of the link text still ends the sentence. The other
// filler is upper case, because lowercase text after a full stop means the
// sentence continues.
/** @type {[RegExp, string][]} */
const MASKED = [
  [/`+[^`]*`+/g, "X"],
  [/\]\([^)]*\)/g, " "],
  [/<[^ >]+>/g, "X"],
  // The URL stops before trailing punctuation.
  [/\bhttps?:\/\/\S*[^\s.,;:!?]/g, "X"],
];

// Matches the blockquote arrows and list marker at the start of a line,
// because a marker such as "1." looks like a sentence end.
const LEADING_MARKERS = /^[\s>]*(?:[-*+]\s+|\d+[.)]\s+)?/;

/** @param {string} line */
function mask(line) {
  let masked = line;
  for (const [pattern, filler] of MASKED) {
    masked = masked.replace(pattern, (match) => filler.repeat(match.length));
  }
  return masked.replace(LEADING_MARKERS, (match) => " ".repeat(match.length));
}

// True when the full stop at index belongs to an abbreviation, an initial or
// an ellipsis.
/**
 * @param {string} text
 * @param {number} index
 * @param {Set<string>} abbreviations
 */
function isFalseBoundary(text, index, abbreviations) {
  if (text[index] !== ".") {
    return false;
  }
  if (text[index - 1] === "." || text[index + 1] === ".") {
    return true;
  }

  const before = text.slice(0, index + 1);
  const word = (/[A-Za-z.]+$/.exec(before) || [""])[0];

  return abbreviations.has(word.toLowerCase()) || /^[A-Z]\.$/.test(word);
}

// Returns the offset just past each sentence boundary on the line.
/**
 * @param {string} text
 * @param {Set<string>} abbreviations
 */
function boundaries(text, abbreviations) {
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
      !isFalseBoundary(text, match.index, abbreviations)
    ) {
      ends.push(end);
    }
  }

  return ends;
}

// True when a parenthesis or double quotation is still open at index. A full
// stop inside one does not end the outer sentence.
//
// Square brackets are skipped, because masking removes the "]" of a link.
// Single quotes are skipped, because they double as apostrophes. A lone
// straight quote, such as an inch mark, leaves the rest of its line open, so
// the rule reports that line. A wrong report is easier to spot than a missed
// one.
/**
 * @param {string} text
 * @param {number} index
 */
function insideOpenSpan(text, index) {
  let brackets = 0;
  let quotes = 0;
  let straight = false;

  for (const character of text.slice(0, index)) {
    if (character === "(") {
      brackets += 1;
    } else if (character === ")") {
      brackets = Math.max(0, brackets - 1);
    } else if (character === "\u201c") {
      quotes += 1;
    } else if (character === "\u201d") {
      quotes = Math.max(0, quotes - 1);
    } else if (character === '"') {
      straight = !straight;
    }
  }

  return brackets > 0 || quotes > 0 || straight;
}

// Finds the first letter after a boundary, past whitespace, opening quotes,
// brackets and emphasis markers.
const NEXT_LETTER = /^[\s"'([*_\u201c\u2018]*([A-Za-z])/;

// True when the next word starts in lower case, so the sentence continues,
// as after a quotation that ends in a full stop. A sentence that starts with
// a lowercase word, such as a command name, is missed.
/**
 * @param {string} text
 * @param {number} end
 */
function continuesInLowerCase(text, end) {
  const match = NEXT_LETTER.exec(text.slice(end));

  return match !== null && match[1] === match[1].toLowerCase();
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
 * @param {Set<string>} abbreviations
 */
function checkParagraph(lines, startLine, onError, abbreviations) {
  lines.forEach((line, offset) => {
    const lineNumber = startLine + offset;
    const masked = mask(line);
    // Both checks below use this list, so a line that ends at a quoted full
    // stop is reported as ending mid-sentence.
    const ends = boundaries(masked, abbreviations).filter(
      (end) => !insideOpenSpan(masked, end),
    );
    const last = offset === lines.length - 1;

    for (const end of ends) {
      if (
        masked.slice(end).trim() === "" ||
        continuesInLowerCase(masked, end)
      ) {
        continue;
      }
      onError({
        lineNumber,
        "detail": "Second sentence starts on the same line",
        "context": snippet(line, end),
      });
      break;
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
    const configured = params.config.abbreviations ?? [];
    const abbreviations = new Set([
      ...ABBREVIATIONS,
      ...configured.map((word) => word.toLowerCase()),
    ]);

    tokens.forEach((token, index) => {
      if (
        token.type !== "inline" ||
        tokens[index - 1].type !== "paragraph_open"
      ) {
        return;
      }
      const [start, end] = token.map;
      checkParagraph(
        params.lines.slice(start, end),
        start + 1,
        onError,
        abbreviations,
      );
    });
  },
};

export default rule;
