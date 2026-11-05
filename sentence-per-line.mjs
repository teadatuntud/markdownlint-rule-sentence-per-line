// @ts-check

// Every sentence must start a line, and every line must start a sentence.
// A paragraph's last line may be a fragment.

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

const SENTENCES = new Intl.Segmenter("en", { "granularity": "sentence" });

const LINE_END = /[.?!]["'\u201d\u2019)\]]*$/;

// Masked so their punctuation does not count. The mask is upper case,
// because a lowercase word after a full stop continues the sentence.
const FILLED = new Set([
  "autolink",
  "codeText",
  "htmlText",
  "image",
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
 * @typedef {{
 *   lineNumber: number,
 *   text: string,
 *   columns: number[],
 *   hardBreak: boolean,
 * }} Line
 */

/** @param {Token} paragraph */
function proseLines(paragraph) {
  /** @type {Line[]} */
  const lines = [];
  /** @type {Line} */
  let line;

  /** @param {number} lineNumber */
  const newLine = (lineNumber) => {
    line = { lineNumber, text: "", columns: [], hardBreak: false };
    lines.push(line);
  };
  newLine(paragraph.startLine);

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
        newLine(line.lineNumber + 1);
      } else if (token.type === "hardBreakEscape") {
        // Only backslash breaks. Trailing spaces are invisible in the source.
        line.hardBreak = true;
      } else if (FILLED.has(token.type)) {
        token.text.split("\n").forEach((part, index) => {
          if (index > 0) {
            newLine(line.lineNumber + 1);
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

  // A line may hold only markup, such as a footnote call.
  return lines.flatMap((line) => {
    const lead = line.text.search(/\S/);
    return lead === -1
      ? []
      : [
          {
            ...line,
            text: line.text.slice(lead),
            columns: line.columns.slice(lead),
          },
        ];
  });
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

/**
 * @param {string} sentence
 * @param {Set<string>} abbreviations
 */
function endsInAbbreviation(sentence, abbreviations) {
  const text = sentence.trimEnd().replace(/["'\u201d\u2019)\]]+$/, "");
  if (!text.endsWith(".")) {
    return false;
  }

  const word = (/[A-Za-z.]+$/.exec(text) ?? [""])[0];
  // An initial is a lone capital, so the "O." that ends "I/O." is not one.
  const initial = /(?:^|[\s("\u201c])[A-Z]\.$/.test(text);

  return (
    word.endsWith("..") || abbreviations.has(word.toLowerCase()) || initial
  );
}

// Single quotes are skipped, because they double as apostrophes. A lone
// straight quote, such as an inch mark, joins the rest of the paragraph into
// one sentence, so the rule reports each later line. A wrong report is easier
// to spot than a missed one.
/** @param {string} sentence */
function leavesSpanOpen(sentence) {
  let brackets = 0;
  let quotes = 0;
  let straight = false;

  for (const character of sentence) {
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

/**
 * @param {string} text
 * @param {number[]} lineStarts
 * @param {Set<string>} abbreviations
 */
function sentenceStarts(text, lineStarts, abbreviations) {
  const candidates = new Set();
  for (const { index } of SENTENCES.segment(text)) {
    // Segmenter also splits inside ".NET", so only take splits after spaces.
    if (/\s/.test(text[index - 1] ?? "")) {
      candidates.add(index);
    }
  }
  // Line-final punctuation always ends a sentence, even before a lowercase
  // command name.
  for (const first of lineStarts) {
    if (LINE_END.test(text.slice(0, first).trimEnd())) {
      candidates.add(first);
    }
  }

  const starts = [];
  let from = 0;
  for (const index of [...candidates].sort((a, b) => a - b)) {
    const sentence = text.slice(from, index);
    if (
      endsInAbbreviation(sentence, abbreviations) ||
      leavesSpanOpen(sentence)
    ) {
      continue;
    }
    starts.push(index);
    from = index;
  }

  return starts;
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
  let text = "";
  const lineStarts = [];
  for (const line of lines) {
    text += text === "" ? "" : " ";
    lineStarts.push(text.length);
    text += line.text;
  }

  const starts = sentenceStarts(text, lineStarts, abbreviations);
  const startSet = new Set(starts);
  /** @type {Set<number>} */
  const reported = new Set();

  for (const start of starts) {
    const index = lineStarts.findLastIndex((first) => first <= start);
    if (lineStarts[index] === start || reported.has(index)) {
      continue;
    }
    reported.add(index);
    const { lineNumber, columns } = lines[index];
    const previousEnd = text.slice(0, start).trimEnd().length - 1;
    onError({
      lineNumber,
      "detail": "Second sentence starts on the same line",
      "context": snippet(
        source[lineNumber - 1],
        columns[previousEnd - lineStarts[index]],
      ),
    });
  }

  lines.forEach((line, index) => {
    const next = lineStarts[index + 1];
    if (
      next === undefined ||
      startSet.has(next) ||
      line.hardBreak ||
      // A single word, such as a long URL, cannot be broken.
      !/\s/.test(line.text.trim())
    ) {
      return;
    }
    const sourceLine = source[line.lineNumber - 1];
    onError({
      "lineNumber": line.lineNumber,
      "detail": "Line ends mid-sentence; break at sentence boundaries only",
      "context": snippet(sourceLine, sourceLine.trimEnd().length),
    });
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
