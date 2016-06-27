'use babel'

import * as _ from 'lodash'
import Spell from './spell'
// import PlainMatcher from './matchers/plain-matcher.js'

class Main {

  constructor () {
    this.locale = 'en_US'
    require('os-locale')((err, locale) => {
      if (!err) {
        this.locale = locale || this.locale
      }
    })
    this.grammars = []
    this.checkers = {}
    //this.grammars = {}
  }

  provideGrammar() {
    return [{
      grammarScopes: ['text.plain'],
//      getDictionaries: textEditor => [],
      getRanges: textEditor => [textEditor.getBuffer().getRange()]
    }, {
      grammarScopes: ['text.tex', 'text.tex.latex'],
      getDictionaries: textEditor => {
        let dictionaries = []
        textEditor.scan(/^%\s*!TEX\s+spellcheck\s*=\s*(.*)$/im, ({match, stop}) => {
          dictionaries = match[1].split(/(?:\s,)+/)
          stop()
        })
        return dictionaries
      },
      getRanges: textEditor => {
        let ranges = []
        textEditor.scan(/(^|\\\\|[\[\]{}])[^{}\\\[\]]+(?=$|\\\\|[\[\]{}])/gim, ({match, range}) => {
          if (match[1]) {
            range.start.column++
          }
          ranges.push(range)
        })
        return ranges
      }
    }]
  }

  consumeGrammar(grammar) {
    this.grammars = _.concat(this.grammars, grammar)
  }

  getGrammar(scope) {
    return _.find(this.grammars, grammar => _.includes(grammar.grammarScopes, scope))
  }

  activate () {
    //atom.config.onDidChange('linter-spell', this.updateGrammars)
    //this.updateGrammars()
  }

  deactivate () {
  }

  getChecker (dictionaries) {
    let id = dictionaries.join()
    if (!this.checkers[id]) {
      this.checkers[id] = new Spell(name, dictionaries)
    }

    return this.checkers[id]
  }

  // updateGrammars () {
  //   this.grammars = {}
  //   for (const name of ['tex', 'html', 'xml', 'plain']) {
  //     const enable = atom.config.get(`linter-spell.${name}Enable`) !== false
  //     if (enable) {
  //       const grammars = atom.config.get(`linter-spell.${name}GrammarScopes`)
  //       for (const grammar of grammars) {
  //         this.grammars[grammar] = name
  //       }
  //     }
  //   }
  // }

  consumeLinter (linter) {
    this.linter = linter
  }

  intentions ({textEditor, bufferPosition}) {
    const editorLinter = this.linter.getEditorLinter(textEditor)
    if (editorLinter) {
      for (const message of editorLinter.getMessages()) {
        if (message.linter === 'spell' && message.range && message.range.containsPoint(bufferPosition)) {
          return message.intentions
        }
      }
      // const markers = textEditor.findMarkers({
      //   // name: 'hunspell',
      //   containsBufferPosition: bufferPosition
      // })
      // console.log(markers)
      // return []
      // return markers.length > 0 ? markers[0].getProperties().intentions : []
    }
    return []
  }

  async lint (textEditor, scopeName) {
    let messages = []
    if (!scopeName) {
      scopeName = textEditor.getGrammar().scopeName
    }
    const grammar = this.getGrammar(scopeName)
    if (grammar) {
      const filePath = textEditor.getPath()

      const dictionaries = _.find([
        grammar.getDictionaries ? grammar.getDictionaries(textEditor) : [],
        atom.config.get('linter-spell.defaultDictionaries'),
        [this.locale]
      ], d => d.length > 0)

      console.log(dictionaries)
      const checker = this.getChecker(dictionaries)
      console.log(checker)

      for (const range of grammar.getRanges(textEditor)) {
        for (const misspelling of await checker.getMisspellings(textEditor, range)) {
          const range = misspelling.range
          const original = misspelling.original
          const intentions = _.concat(_.map(misspelling.suggestions,
            (miss, index) => {
              return {
                priority: -index,
                icon: 'light-bulb',
                title: `Change to "${miss}"`,
                selected: () => {
                  textEditor.setTextInBufferRange(range, miss)
                }
              }
            }), {
              priority: -100,
              icon: 'check',
              title: 'Add word',
              selected: function () {
                checker.addWord(original)
              }
            }, {
              priority: -101,
              icon: 'check',
              title: 'Add word (case insensitive)',
              selected: function () {
                checker.addWordCaseInsensitive(original)
              }
            }, {
              priority: -102,
              icon: 'circle-slash',
              title: 'Ignore word',
              selected: function () {
                checker.ignoreWord(original)
              }
            }, {
              priority: -103,
              icon: 'circle-slash',
              title: 'Ignore word (case insensitive)',
              selected: function () {
                checker.ignoreWordCaseInsensitive(original)
              }
            })
          messages.push({
            type: 'Warning',
            text: `${misspelling.original}: ${misspelling.suggestions.join(', ')}`,
            range: range,
            intentions: intentions,
            filePath: textEditor.getPath()
          })

        }
        // messages.push({
        //   type: 'Warning',
        //   text: textEditor.getTextInBufferRange(range),
        //   range: range,
        //   filePath: filePath
        // })
      }
    }
    //
    // const name = this.grammars[scopeName]
    // if (name) {
    //   let dictionaries = atom.config.get('linter-spell.defaultDictionaries')
    //   dictionaries = (dictionaries.length === 0) ? this.locale : dictionaries.join(',')
    //   if (name in dictionaryPattern) {
    //     const match = textEditor.getBuffer().getText().match(dictionaryPattern[name])
    //     if (match) {
    //       dictionaries = match[1].replace(dictionarySeparatorPattern, ',')
    //     }
    //   }
    //   let checker = this.getChecker(name, dictionaries)
    //   for (let i = 0; i < textEditor.getLineCount(); i++) {
    //     for (const word of await checker.checkLine(textEditor.getBuffer().lineForRow(i))) {
    //       const range = [[i, word.offset], [i, word.offset + word.original.length]]
    //       const original = word.original
    //       const intentions = _.concat(_.map(word.misses,
    //         (miss, index) => {
    //           return {
    //             priority: -index,
    //             icon: 'light-bulb',
    //             title: `Change to "${miss}"`,
    //             selected: () => {
    //               textEditor.setTextInBufferRange(range, miss)
    //             }
    //           }
    //         }), {
    //           priority: -100,
    //           icon: 'check',
    //           title: 'Add word',
    //           selected: function () {
    //             checker.addWord(original)
    //           }
    //         }, {
    //           priority: -101,
    //           icon: 'check',
    //           title: 'Add word (case insensitive)',
    //           selected: function () {
    //             checker.addWordCaseInsensitive(original)
    //           }
    //         }, {
    //           priority: -102,
    //           icon: 'circle-slash',
    //           title: 'Ignore word',
    //           selected: function () {
    //             checker.ignoreWord(original)
    //           }
    //         }, {
    //           priority: -103,
    //           icon: 'circle-slash',
    //           title: 'Ignore word (case insensitive)',
    //           selected: function () {
    //             checker.ignoreWordCaseInsensitive(original)
    //           }
    //         })
    //       messages.push({
    //         type: 'Warning',
    //         text: `${word.original}: ${word.misses.join(', ')}`,
    //         range: range,
    //         intentions: intentions,
    //         filePath: textEditor.getPath()
    //       })
    //     }
    //   }
    // }
    return messages
  }

  provideIntentions () {
    let foo = this
    return {
      grammarScopes: ['*'],
      getIntentions: scope => { return foo.intentions(scope) }
    }
  }

  provideLinter () {
    let foo = this
    return {
      name: 'spell',
      grammarScopes: ['*'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor, scopeName) => { return foo.lint(textEditor, scopeName) }
    }
  }
}

export default new Main()
