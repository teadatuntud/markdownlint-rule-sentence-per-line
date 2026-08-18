# Fixtures for sentence-per-line

Input for the neighbouring `run` script, which explains how expectations are derived from this file.
Every case below is prose the rule has to judge, so keep it prose.

## Two sentences on one line

This is one sentence. This is a second one, so the line is FLAGME.

## Mid-sentence breaks

This paragraph breaks in the middle of a FLAGME
sentence, which is what the rule forbids.

- A list item that wraps mid-sentence is FLAGME
  in exactly the same way.
- 1000 words of context. A second sentence on the item's line is FLAGME.

## Abbreviations and initials

Some tools break mid-clause, e.g. at a comma, and that is not a boundary.
Full stops in i.e. and etc. and vs. do not end a sentence either.
Neither does an initial, as in D. A. Anson.
An ellipsis does not end one ... and the sentence carries on.

## Filenames, versions and code

The file README.md sits next to CHANGELOG.md at version 2.0 of the release.
Inline code such as `docs/style.md` and `e.g. two. sentences.` is masked.
See the [reference manual](https://example.com/a.b.c) for the details.

https://example.com/a/very/long/path/that/cannot/be/broken/at/all
is the canonical source for that.

A sentence may end in a bare URL, as in https://example.com/a.
The full stop after it is still the end of the sentence.

/usr/local/share/doc/example/reference/manual.md
is where the installed copy lives, and it has no break point either.

## Emphasis around a boundary

A sentence may end in **bold.**
The emphasis marker does not hide the boundary.

This one ends in **bold.** A second sentence follows it, so the line is FLAGME.

## Links around a boundary

A sentence may end inside [a link.](https://example.com/guide)
The masked destination does not hide the boundary either.

It ends in [a link.](https://example.com/guide) A second sentence makes it FLAGME.

## Hard breaks

A trailing backslash asks for a break, so this sentence may run\
on to the next line without being reported.

## Fragments and closing punctuation

A paragraph's last line may be a fragment with no full stop, like this one

She said "this ends inside the quotes."
Parenthetical endings work too (as here).
A question ends a sentence?
So does an exclamation!

## Blocks the rule must not touch

| Column | Meaning |
| ------ | ------- |
| one    | First. Second. |

```text
This is one sentence. This is a second, and code is never checked.
```

## Blockquotes are prose

> Quoted text is judged like any other. So this quoted line is FLAGME.
