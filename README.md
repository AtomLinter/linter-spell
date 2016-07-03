# linter-spell [![Travis-CI Build Status](https://img.shields.io/travis/yitzchak/linter-spell/master.svg?label=Linux/OSX%20build)](https://travis-ci.org/yitzchak/linter-spell) [![AppVeyor Build Status](https://img.shields.io/appveyor/ci/yitzchak/linter-spell/master.svg?label=Windows%20build)](https://ci.appveyor.com/project/yitzchak/linter-spell) [![David](https://img.shields.io/david/yitzchak/linter-spell.svg)](https://david-dm.org/yitzchak/linter-spell)

Linter plugin for Atom using Ispell compatible interface such as [GNU Aspell](http://aspell.net/),
[Hunspell](https://hunspell.github.io/) or [Enchant](http://www.abisource.com/projects/enchant/).

## Installing

Use the Atom package manager and search for "linter-spell", or run
`apm install linter-spell` from the command line.

## Prerequisites

This package relies on a `Ispell` compatible package such as [GNU Aspell](http://aspell.net/),
[Hunspell](https://hunspell.github.io/) or [Enchant](http://www.abisource.com/projects/enchant/).

## Usage

Spell checking is done upon document save with misspellings displayed by
[linter](https://atom.io/packages/linter). Misspellings can be
corrected or added to personal dictionary using the
[intentions](https://atom.io/packages/intentions) package via
`ctrl` + `enter` on OSX and `alt` + `enter` on Linux and Windows.

## Providers

Spell checking plain text, Markdown, or AsciiDoc documents is included in the
package. To spell check other document types use a `linter-spell-grammar`
provider:

| Grammar             | Atom Package                                                      |
|---------------------|-------------------------------------------------------------------|
| HTML                | [linter-spell-html](https://atom.io/packages/linter-spell-html)   |
| TeX, LaTeX & BibTeX | [linter-spell-latex](https://atom.io/packages/linter-spell-latex) |

## Creating New Provider

New grammars can be added by implementing a `linter-spell-grammar` provider.
This can be done by adding the following to `package.json`

    "providedServices": {
      "linter-spell-grammar": {
        "versions": {
          "1.0.0": "provideGrammar"
        }
      }
    }

The provided service should be as follows

    provideGrammar () {
      return [{
        grammarScopes: ['source.gfm'],
        getDictionaries: textEditor => { return ['en_US'] },
        checkedScopes: {
          'source.gfm': true,
          'markup.underline.link.gfm': false
        }
      }]
    }

Multiple grammars can be provides by returning an array. `grammarScopes` is
required, but all other properties and methods are optional.

The `getDictionaries` method should scan `textEditor` for a
file specific override of the user's default dictionaries and return `[]` if
no dictionary references were found. See
[linter-spell-latex](https://atom.io/packages/linter-spell-latex)
for an implementation using TeX magic comments.

The `checkedScopes` list the grammar scopes that either checked or ignored.
To explicitly check a scope use a value of `true`, while `false` will ignore
that scope. If this property is not provided then all scopes in `grammarScopes`
will be checked. When it is provided all scopes default to ignored unless
specified with a `true` value.

## Status

Please note that this package is in an **alpha** state.
