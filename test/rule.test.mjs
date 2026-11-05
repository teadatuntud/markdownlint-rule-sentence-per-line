// @ts-check

// The rule must report exactly the fixture lines that contain the word
// FLAGME.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { lint } from "markdownlint/promise";
import rule from "../sentence-per-line.mjs";

/** @type {Record<string, true | { abbreviations: string[] }>} */
const cases = {
  "default": true,
  "extra-abbreviations": { "abbreviations": ["dr.", "prof."] },
};

for (const [name, config] of Object.entries(cases)) {
  test(name, async () => {
    const text = await readFile(
      new URL(`fixtures/${name}.md`, import.meta.url),
      "utf8",
    );
    // The fixtures break other rules on purpose, so only this rule runs.
    const results = await lint({
      "strings": { [name]: text },
      "customRules": [rule],
      "config": { "default": false, "sentence-per-line": config },
    });
    const errors = results[name];

    const expected = text
      .split("\n")
      .flatMap((line, index) => (line.includes("FLAGME") ? [index + 1] : []));
    const actual = [...new Set(errors.map((error) => error.lineNumber))];

    const report = errors
      .map((error) => `${error.lineNumber}: ${error.errorDetail}`)
      .join("\n");
    assert.deepEqual(
      actual,
      expected,
      `Reported lines ${actual}, FLAGME lines ${expected}\n${report}`,
    );
  });
}
