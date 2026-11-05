// @ts-check

// The rule must report exactly the fixture lines that contain the word
// FLAGME.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import rule from "../sentence-per-line.mjs";

// markdownlint 0.36 has only a CommonJS API. Later versions export lint from
// markdownlint/promise.
/** @returns {Promise<typeof import("markdownlint/promise").lint>} */
async function loadLint() {
  try {
    return (await import("markdownlint/promise")).lint;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED"
    ) {
      throw error;
    }
    return createRequire(import.meta.url)("markdownlint").promises.markdownlint;
  }
}

const lint = await loadLint();

/** @type {Record<string, true | { abbreviations: string[] }>} */
const cases = {
  "default": true,
  "extra-abbreviations": { "abbreviations": ["dr.", "prof."] },
  "limits": true,
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
