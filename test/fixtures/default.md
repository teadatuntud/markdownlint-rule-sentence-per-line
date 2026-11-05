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

## Quotations that hold a full stop

A tagline ("The right partner is in your dome." with a subtitle beneath it) sets the tone.

Incoming reads **"Accepted invitations move to Crew Links. Only pending paperwork is shown."**

The page renders **"Unable to load."** as an alert and a **"Retry"** action.

The page renders **"Unable to load this FLAGME.
Try again."** as an alert.

A tagline ("The right partner is in your dome FLAGME."
with a subtitle beneath it) sets the tone.

The page renders **"Unable to load."** as an alert. A second sentence still makes it FLAGME.

Run the tool. `npm test` fails, so a masked span does not read as a lowercase word and this line is FLAGME.

He said "Go now." She left, so this line is FLAGME.

The banner reads **"Try again."** The user clicks it, so this line is FLAGME.

## Spans that cross a line break

A code span that crosses a line break is FLAGME, as in `make
check`. The second sentence on this line makes it FLAGME.

A pair of quotes that crosses a line break is FLAGME ("One here." "Two
there."). The second sentence on this line makes it FLAGME.

## Full stops next to markup

It talks to the card over [Port I/O](https://example.com/io). The second sentence makes this line FLAGME.
The target is DOS/4G.
The line before ends a sentence, because the G in 4G is not an initial.
Install .NET before the build, because the full stop in .NET does not end a sentence.

> [!NOTE]
> The marker of a GitHub alert is not a sentence.

## Lowercase words at a line break

The build finishes first.
npm then runs the tests, so a line may start with a lowercase command.

## Images

The screenshots follow, so this line is FLAGME
![](media/screenshot.png)

[![build](https://example.com/badge.svg)](https://example.com/ci)
[![docs](https://example.com/docs.svg)](https://example.com/docs)

## Blocks the rule must not touch

<p>An HTML block is not checked. It may hold two sentences.</p>

<!--
A comment is not checked. It may hold two sentences.
-->

| Column | Meaning |
| ------ | ------- |
| one    | First. Second. |

```text
This is one sentence. This is a second, and code is never checked.
```

## Blockquotes are prose

> Quoted text is judged like any other. So this quoted line is FLAGME.
