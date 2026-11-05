# Fixtures for a configured abbreviation list

Input for `test/rule.test.mjs`, which explains how expectations are derived from this file.
The test adds `dr.` and `prof.` to the abbreviations the rule knows.

## The configured words

Ask Dr. Smith about it, because a configured word does not end a sentence.
Neither does Prof. Jones, and the case of the entry does not matter.

## The built-in words survive

A configured list adds to the defaults, e.g. this one, rather than replacing them.
Full stops in i.e. and etc. still do not end a sentence here.

## Everything else is unchanged

Ask Mrs. Smith about it, because an unconfigured title is still FLAGME.
This is one sentence. This is a second one, so the line is FLAGME.
