# linter-spell [![Travis-CI Build Status](https://img.shields.io/travis/yitzchak/linter-spell/master.svg?label=Linux/OSX%20build)](https://travis-ci.org/yitzchak/linter-spell) [![AppVeyor Build Status](https://img.shields.io/appveyor/ci/yitzchak/linter-spell/master.svg?label=Windows%20build)](https://ci.appveyor.com/project/yitzchak/linter-spell)

Atom Linter plugin for hunspell.

## Installing
This package is alpha level software and is not available via `apm` or the Atom
package manager. If it was you would use the Atom package manager and search for
"linter-spell", or run `apm install linter-spell` from the command line.

## Prerequisites
This package relies on a `ispell` compatible package such as `hunspell`.

## Providers
Spell checking plain text documents is included in the package. To spell check
other document types use a `linter-spell-grammar` provider:

  * LaTeX - [!(https://github.com/yitzchak/linter-spell-latex)](linter-spell-latex)

## Status
Please note that this package is in an **alpha** state.
