# linter-spell

[![Travis&#x2011;CI Build Status](https://img.shields.io/travis/yitzchak/linter-spell/master.svg?label=Linux/OSX%20build)](https://travis-ci.org/yitzchak/linter-spell) [![AppVeyor Build Status](https://img.shields.io/appveyor/ci/yitzchak/linter-spell/master.svg?label=Windows%20build)](https://ci.appveyor.com/project/yitzchak/linter-spell) [![David](https://img.shields.io/david/yitzchak/linter-spell.svg)](https://david-dm.org/yitzchak/linter-spell)

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

| Grammar                  | Spell Package                                                               | Grammar Package                                                     | File Specific Dictionary            |
|--------------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------|-------------------------------------|
| AsciiDoc                 | Included in linter&#x2011;spell                                                    | [language&#x2011;asciidoc](https://atom.io/packages/language-asciidoc)     | `:lang:` attribute                  |
| Git Commit Message       | Included in linter&#x2011;spell                                                    | [language&#x2011;git](https://atom.io/packages/language-git)               | None                                |
| GitHub flavored Markdown | Included in linter&#x2011;spell                                                    | [language&#x2011;gfm](https://atom.io/packages/language-gfm)               | None                                |
| HTML                     | [linter&#x2011;spell&#x2011;html](https://atom.io/packages/linter-spell-html)             | [language&#x2011;html](https://atom.io/packages/language-html)             | `lang` attribute                    |
| Javascript               | [linter&#x2011;spell&#x2011;javascript](https://atom.io/packages/linter-spell-javascript) | [language&#x2011;javascript](https://atom.io/packages/language-javascript) | None                                |
| LaTeX, TeX & BibTeX      | [linter&#x2011;spell&#x2011;latex](https://atom.io/packages/linter-spell-latex)           | [language&#x2011;latex](https://atom.io/packages/language-latex)           | `%!TeX spellcheck` magic comment    |
| Plain Text               | Included in linter&#x2011;spell                                                    | [language&#x2011;text](https://atom.io/packages/language-text)             | None                                |

## Creating New Providers

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
        },
        getRanges: (textEditor, ranges) => {
          return {
            ranges: ranges,
            ignoredRanges: []
          }
        }
      }]
    }

Multiple grammars can be provides by returning an array. `grammarScopes` is
required, but all other properties and methods are optional.

The `getDictionaries` method should scan `textEditor` for a
file specific override of the user's default dictionaries and return `[]` if
no dictionary references were found. See
[linter&#x2011;spell&#x2011;latex](https://atom.io/packages/linter-spell-latex)
for an implementation using TeX magic comments.

The `checkedScopes` list the grammar scopes that either checked or ignored.
To explicitly check a scope use a value of `true`, while `false` will ignore
that scope. If this property is not provided then all scopes in `grammarScopes`
will be checked. When it is provided all scopes default to ignored unless
specified with a `true` value.

The `getRanges` method should check the `ranges` parameter for sub-ranges
within each ranges which are valid to spell check. It should return a list
of modified ranges in `ranges` and can also return `ignoredRanges` for
ranges that should not be checked. The interval difference between `ranges`
and `ignoredRanges` will actually be checked.

## Status

Please note that this package is in a **beta** state.
