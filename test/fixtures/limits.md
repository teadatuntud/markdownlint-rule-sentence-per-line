# Fixtures for the known limits

Input for `test/rule.test.mjs`, which explains how expectations are derived from this file.
Each case is a limit that the README lists, and the fixture pins down what the rule does with it today.
A change that fixes a limit fails the test, so update the README in the same change.

## A listed abbreviation at a sentence end

The list includes etc. Then the second sentence on this line is missed.

## A digit after a full stop

The build is done. 2 files changed, and the second sentence on this line is missed.

## A lowercase word after a full stop

Run the build. npm then runs the tests, and the second sentence on this line is missed.

## A lowercase word after an exclamation mark

Use the view! macro to build the tree, and this line is FLAGME.

## Two sentences in a parenthesis

A parenthesis may hold two sentences (The first ends here, so this line is FLAGME.
The second follows on the next line.) and the paragraph ends.

## A lone straight quote

The pipe is 3" wide. The second sentence on this line is missed, and the line is FLAGME.
Every later line in the paragraph is FLAGME as well.
The last line of a paragraph is not checked.

## A hard break made of two trailing spaces

This line ends in two trailing spaces, and it is FLAGME  
because the rule does not accept that hard break.
