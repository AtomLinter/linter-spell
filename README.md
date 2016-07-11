# linter-spell

[![Travis&#x2011;CI Build Status](http://img.shields.io/travis/yitzchak/linter-spell/master.svg?label=Linux/OSX%20build)](http://travis-ci.org/yitzchak/linter-spell) [![AppVeyor Build Status](http://img.shields.io/appveyor/ci/yitzchak/linter-spell/master.svg?label=Windows%20build)](http://ci.appveyor.com/project/yitzchak/linter-spell) [![David](http://img.shields.io/david/yitzchak/linter-spell.svg)](http://david-dm.org/yitzchak/linter-spell)

Multilingual grammar-specific spell checking for [Atom](http://atom.io) and
[linter](http://atom.io/packages/linter) using Ispell compatible interface such
as [GNU Aspell](http://aspell.net/), [Hunspell](http://hunspell.github.io/) or
[Enchant](http://www.abisource.com/projects/enchant/).

## Installing

Use the Atom package manager and search for "linter-spell", or run
`apm install linter-spell` from the command line.

## Prerequisites

This package relies on a `Ispell` compatible package such as [GNU Aspell](http://aspell.net/),
[Hunspell](http://hunspell.github.io/) or [Enchant](http://www.abisource.com/projects/enchant/).

## Usage

Spell checking is done upon document save with misspellings displayed by
[linter](http://atom.io/packages/linter). Misspellings can be
corrected or added to personal dictionary using the
[intentions](http://atom.io/packages/intentions) package via
`ctrl` + `enter` on OSX and `alt` + `enter` on Linux and Windows.

## Providers

Spell checking plain text, Markdown, or AsciiDoc documents is included in the
package. To spell check other document types use a `linter-spell-grammar`
provider:

| Grammar                  | Spell Package                                                                            | Grammar Package                                                           | File Specific Dictionary            |
|--------------------------|------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|-------------------------------------|
| AsciiDoc                 | Included in linter&#x2011;spell                                                          | [language&#x2011;asciidoc](http://atom.io/packages/language-asciidoc)     | `:lang:` attribute                  |
| Git Commit Message       | Included in linter&#x2011;spell                                                          | [language&#x2011;git](http://atom.io/packages/language-git)               | None                                |
| GitHub flavored Markdown | Included in linter&#x2011;spell                                                          | [language&#x2011;gfm](http://atom.io/packages/language-gfm)               | None                                |
| HTML                     | [linter&#x2011;spell&#x2011;html](http://atom.io/packages/linter-spell-html)             | [language&#x2011;html](http://atom.io/packages/language-html)             | `lang` attribute                    |
| Javascript               | [linter&#x2011;spell&#x2011;javascript](http://atom.io/packages/linter-spell-javascript) | [language&#x2011;javascript](http://atom.io/packages/language-javascript) | None                                |
| LaTeX, TeX & BibTeX      | [linter&#x2011;spell&#x2011;latex](http://atom.io/packages/linter-spell-latex)           | [language&#x2011;latex](http://atom.io/packages/language-latex)           | `%!TeX spellcheck` magic comment    |
| Plain Text               | Included in linter&#x2011;spell                                                          | [language&#x2011;text](http://atom.io/packages/language-text)             | None                                |

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

Multiple grammars can be provided by returning an array. `grammarScopes` is
required, but all other properties and methods are optional.

The `getDictionaries` method should scan `textEditor` for a
file specific override of the user's default dictionaries and return `[]` if
no dictionary references were found. See
[linter&#x2011;spell&#x2011;latex](http://atom.io/packages/linter-spell-latex)
for an implementation using TeX magic comments. [RFC 5646](http://www.rfc-editor.org/rfc/rfc5646.txt)
language codes may also be returned and `linter-spell` will try to infer which
dictionary to use.

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
