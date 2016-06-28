'use babel'

import {Range} from 'atom'
import * as _ from 'lodash'
import Spell from './spell'

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
  }

  provideGrammar () {
    return [{
      grammarScopes: [
        'source.asciidoc',
        'source.gfm',
        'text.git-commit',
        'text.plain',
        'text.plain.null-grammar'],
      getRanges: (textEditor, ranges) => { return { ranges: ranges, ignoredRanges: [] } }
    }]
  }

  consumeGrammar (grammar) {
    this.grammars = _.concat(this.grammars, grammar)
  }

  getGrammar (scope) {
    return _.find(this.grammars, grammar => _.includes(grammar.grammarScopes, scope))
  }

  activate () {
  }

  deactivate () {
  }

  getChecker (dictionaries) {
    let id = dictionaries.join()
    if (!this.checkers[id]) {
      this.checkers[id] = new Spell(dictionaries)
    }

    return this.checkers[id]
  }

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
    }
    return []
  }

  async lint (textEditor) {
    let messages = []
    const grammar = this.getGrammar(textEditor.getGrammar().scopeName)
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

      let {ranges, ignoredRanges} = grammar.getRanges(textEditor, [textEditor.getBuffer().getRange()])

      for (const ignoredRange of ignoredRanges) {
        ranges = _.flatMap(ranges, range => {
          if (range.intersectsWith(ignoredRange)) {
            let r = []
            if (range.start.isLessThan(ignoredRange.start)) {
              r.push(new Range(range.start, ignoredRange.start))
            }
            if (ignoredRange.end.isLessThan(range.end)) {
              r.push(new Range(ignoredRange.end, range.end))
            }
            return r
          } else {
            return range
          }
        })
      }
      console.log(ranges)

      for (let range of ranges) {
        for (const misspelling of await checker.getMisspellings(textEditor, range)) {
          const range = misspelling.range
          const word = misspelling.text
          const intentions = _.concat(_.map(misspelling.suggestions,
            (suggestion, index) => {
              return {
                priority: -index,
                icon: 'light-bulb',
                title: `Change to "${suggestion}"`,
                selected: () => {
                  textEditor.setTextInBufferRange(range, suggestion)
                }
              }
            }), {
              priority: -100,
              icon: 'check',
              title: 'Add word',
              selected: function () {
                checker.addWord(word)
              }
            }, {
              priority: -101,
              icon: 'check',
              title: 'Add word (case insensitive)',
              selected: function () {
                checker.addWordCaseInsensitive(word)
              }
            }, {
              priority: -102,
              icon: 'circle-slash',
              title: 'Ignore word',
              selected: function () {
                checker.ignoreWord(word)
              }
            }, {
              priority: -103,
              icon: 'circle-slash',
              title: 'Ignore word (case insensitive)',
              selected: function () {
                checker.ignoreWordCaseInsensitive(word)
              }
            })
          messages.push({
            type: 'Warning',
            text: `${misspelling.text}: ${misspelling.suggestions.join(', ')}`,
            range: range,
            intentions: intentions,
            filePath: filePath
          })
        }
      }
    }
    return _.sortBy(messages, 'range')
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
