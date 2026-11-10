# markdownlint-rule-sentence-per-line

A [markdownlint](https://github.com/DavidAnson/markdownlint) custom rule that enforces strict semantic line breaks.
Each line holds one full sentence, and a sentence never spans two lines.
Other semantic line break tools also allow a break at a clause boundary, which this rule forbids.

The rule only reports problems and has no autofix, because prose is rewrapped by hand.

## Install

The package is not on the npm registry.
Install it from git, pinned to a tag:

```sh
npm install --save-dev github:teadatuntud/markdownlint-rule-sentence-per-line#v1.0.0
```

The rule reads micromark tokens, so it needs markdownlint 0.36 or later.
markdownlint-cli2 includes that version from 0.15.0.

## Configure

Name the package in `customRules` and turn the rule on in `.markdownlint-cli2.yaml`:

```yaml
customRules:
  - markdownlint-rule-sentence-per-line

config:
  sentence-per-line: true
```

markdownlint-cli2 looks for the package from the directory of its config file.
A global install of markdownlint-cli2 therefore still finds a rule installed in the project.

To turn the rule off for some files, use an override:

```yaml
overrides:
  - filter:
      - "CHANGELOG.md"
    combine: merge
    config:
      sentence-per-line: false
```

### Options

| Option          | Type       | Default | Effect                                                         |
| --------------- | ---------- | ------- | -------------------------------------------------------------- |
| `abbreviations` | `string[]` | `[]`    | Words whose full stop does not end a sentence, such as `"dr."` |

The configured words add to the built-in list, which is `e.g.`, `i.e.`, `etc.`, `vs.`, `cf.`, `al.`, `fig.`, and `no.`.
Matching ignores case.

```yaml
config:
  sentence-per-line:
    abbreviations: ["dr.", "prof."]
```

## What the rule reports

The rule checks every paragraph, including those in list items and blockquotes, and skips HTML blocks.
It reports a line for either of these two problems.

- "Second sentence starts on the same line" for a line that holds a sentence end with more text after it.
- "Line ends mid-sentence" for a line before the last line of a paragraph that does not end at a sentence end.

The last line of a paragraph may end without a full stop, so a heading-like fragment is accepted there.

The rule splits sentences with the Unicode sentence rules, through `Intl.Segmenter`.
These do not count as sentence ends:

- abbreviations from the list above, initials such as `D. A.`, and ellipses
- a full stop followed by a lowercase word, as in `e.g. this`
- a full stop without a space after it, as in `2.0` and `.NET`
- full stops in code spans, link destinations, URLs, HTML tags, and images
- a full stop inside an open parenthesis or double quotation, even across a line break

A line that ends in a full stop, question mark, or exclamation mark ends its sentence, so the next line may start with a lowercase command name.
A line may also end mid-sentence when it ends with a backslash hard break, or when it holds a single token such as a long URL or path.

## Known limits

- A sentence that ends in a listed abbreviation is missed when a second sentence follows it on the same line.
- A sentence that starts with a lowercase word or a digit in the middle of a line is read as the previous sentence continuing.
- A question mark or exclamation mark ends a sentence even when a lowercase word follows it, as in `view! macro`.
- A parenthesis that holds two sentences counts as one sentence, so a line break between them is reported.
- A lone straight quote, such as an inch mark, makes the rest of its paragraph count as quoted text, so every later line in the paragraph is reported as ending mid-sentence.
- A hard break made of two trailing spaces is not accepted, because it is invisible in the source.

## Develop

```sh
npm install
npm test
npm run lint
```

The fixtures in `test/` mark every line the rule must report with the word `FLAGME`.
The comment at the top of `test/rule.test.mjs` describes how the test reads them.

## Licence

The rule is released under the [MIT licence](LICENSE).
