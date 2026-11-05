// @ts-check

// Each line holds one full sentence. The rule reports a line that starts a
// second sentence, and a line before the last in a paragraph that does not
// end at a sentence boundary. The last line may be a fragment without a full
// stop.

// These types cover the part of the markdownlint API that the rule uses, so
// the package does not depend on markdownlint.
/**
 * @typedef {{
 *   type: string,
 *   startLine: number,
 *   startColumn: number,
 *   text: string,
 *   children: Token[],
 * }} Token
 * @typedef {{
 *   lines: string[],
 *   parsers: { micromark: { tokens: Token[] } },
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

// Matches sentence punctuation and any closing quotes or brackets after it.
const BOUNDARY = /[.?!]["'’)\]]*/g;

// A sentence may continue after a backslash hard break. Two trailing spaces
// are not accepted, because they are invisible in the source.
const HARD_BREAK = /\\$/;

// Masked so their punctuation does not count. The mask is upper case,
// because a lowercase word after a full stop continues the sentence.
const FILLED = new Set([
  "autolink",
  "codeText",
  "htmlText",
  "literalAutolink",
  "mathText",
]);

const SKIPPED = new Set([
  "blockQuotePrefix",
  "gfmFootnoteCall",
  "linePrefix",
  "listItemIndent",
  "reference",
  "resource",
]);

/**
 * @typedef {{ lineNumber: number, text: string, columns: number[] }} Line
 */

/** @param {Token} paragraph */
function proseLines(paragraph) {
  /** @type {Line} */
  let line = { lineNumber: paragraph.startLine, text: "", columns: [] };
  const lines = [line];

  const newLine = () => {
    line = { lineNumber: line.lineNumber + 1, text: "", columns: [] };
    lines.push(line);
  };

  /**
   * @param {number} column
   * @param {string} text
   */
  const append = (column, text) => {
    line.text += text;
    for (let index = 0; index < text.length; index += 1) {
      line.columns.push(column + index);
    }
  };

  /** @param {Token[]} tokens */
  const walk = (tokens) => {
    for (const token of tokens) {
      if (token.type === "lineEnding") {
        newLine();
      } else if (FILLED.has(token.type)) {
        token.text.split("\n").forEach((part, index) => {
          if (index > 0) {
            newLine();
          }
          append(index === 0 ? token.startColumn : 1, "X".repeat(part.length));
        });
      } else if (
        SKIPPED.has(token.type) ||
        /(Marker|Sequence)$/.test(token.type)
      ) {
        continue;
      } else if (token.children.length > 0) {
        walk(token.children);
      } else {
        append(token.startColumn, token.text);
      }
    }
  };

  walk(paragraph.children);
  return lines;
}

// Skips HTML blocks, because the HTML decides how their text wraps.
/**
 * @param {Token[]} tokens
 * @returns {Generator<Token>}
 */
function* paragraphs(tokens) {
  for (const token of tokens) {
    if (token.type === "paragraph") {
      yield token;
    } else if (token.type !== "htmlFlow") {
      yield* paragraphs(token.children);
    }
  }
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
  // An initial is a lone capital, so the "O." that ends "I/O." is not one.
  const initial = /(?:^|[\s("\u201c])[A-Z]\.$/.test(before);

  return abbreviations.has(word.toLowerCase()) || initial;
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

// Finds the first letter after a boundary, past whitespace, opening quotes
// and brackets.
const NEXT_LETTER = /^[\s"'([\u201c\u2018]*([A-Za-z])/;

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
  // Take closing quotes and emphasis too, so **"Done."** stays whole.
  const closers = /^[*_"'\u201d\u2019)\]]*/.exec(line.slice(from)) ?? [""];
  const end = from + closers[0].length;
  return line.slice(Math.max(0, end - 30), end).trimStart() || line.trim();
}

/**
 * @param {Line[]} lines
 * @param {string[]} source
 * @param {OnError} onError
 * @param {Set<string>} abbreviations
 */
function checkParagraph(lines, source, onError, abbreviations) {
  lines.forEach(({ lineNumber, text, columns }, offset) => {
    const sourceLine = source[lineNumber - 1];
    // Both checks below use this list, so a line that ends at a quoted full
    // stop is reported as ending mid-sentence.
    const ends = boundaries(text, abbreviations).filter(
      (end) => !insideOpenSpan(text, end),
    );
    const last = offset === lines.length - 1;

    for (const end of ends) {
      if (text.slice(end).trim() === "" || continuesInLowerCase(text, end)) {
        continue;
      }
      onError({
        lineNumber,
        "detail": "Second sentence starts on the same line",
        "context": snippet(sourceLine, columns[end - 1]),
      });
      break;
    }

    if (last || HARD_BREAK.test(text)) {
      return;
    }

    const trimmed = text.trim();
    // A line with a single word, such as a long URL, cannot be broken.
    if (!/\s/.test(trimmed)) {
      return;
    }
    if (!ends.includes(text.trimEnd().length)) {
      onError({
        lineNumber,
        "detail": "Line ends mid-sentence; break at sentence boundaries only",
        "context": snippet(sourceLine, sourceLine.trimEnd().length),
      });
    }
  });
}

const rule = {
  "names": ["sentence-per-line"],
  "description": "Each line holds exactly one sentence",
  "information": new URL(
    "https://github.com/teadatuntud/markdownlint-rule-sentence-per-line#readme",
  ),
  "tags": ["whitespace", "prose"],
  "parser": "micromark",
  // fixInfo is left out because prose is rewrapped by hand.
  /**
   * @param {RuleParams} params
   * @param {OnError} onError
   */
  "function": (params, onError) => {
    const configured = params.config.abbreviations ?? [];
    const abbreviations = new Set([
      ...ABBREVIATIONS,
      ...configured.map((word) => word.toLowerCase()),
    ]);

    for (const paragraph of paragraphs(params.parsers.micromark.tokens)) {
      checkParagraph(
        proseLines(paragraph),
        params.lines,
        onError,
        abbreviations,
      );
    }
  },
};

export default rule;
