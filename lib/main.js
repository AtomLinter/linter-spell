'use babel'

import { Range, Disposable, CompositeDisposable } from 'atom'
import * as _ from 'lodash'
import Spell from './spell'

const Main = {
  disposables: null,
  linter: null,
  locale: null,
  grammars: null,
  checkers: null,

  getGrammar (scope) {
    for (const grammar of this.grammars.values()) {
      if (_.includes(grammar.grammarScopes, scope)) {
        return grammar
      }
    }
  },

  getChecker (dictionaries) {
    let id = dictionaries.join()
    if (!this.checkers[id]) {
      let checker = new Spell(dictionaries)
      this.disposables.add(checker)
      this.checkers[id] = checker
    }

    return this.checkers[id]
  },

  activate () {
    this.disposables = new CompositeDisposable()
    this.locale = 'en_US'
    require('os-locale')((err, locale) => {
      if (!err) {
        this.locale = locale || this.locale
      }
    })
    this.grammars = new Set()
    this.checkers = {}
    require('atom-package-deps').install('linter-spell')
      .then(() => {
        console.log('All dependencies installed, good to go')
      })
  },

  deactivate () {
    this.disposables.dispose()
  },

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
  },

  consumeGrammar (grammars) {
    grammars = _.castArray(grammars)
    for (const grammar of grammars) {
      this.grammars.add(grammar)
    }
    return new Disposable(() => {
      for (const grammar of grammars) {
        this.grammars.delete(grammar)
      }
    })
  },

  consumeLinter (linter) {
    this.linter = linter
    return new Disposable(() => this.linter = null)
  },

  provideIntentions () {
    return {
      grammarScopes: ['*'],
      getIntentions: ({textEditor, bufferPosition}) => {
        if (this.linter) {
          const editorLinter = this.linter.getEditorLinter(textEditor)
          if (editorLinter) {
            for (const message of editorLinter.getMessages()) {
              if (message.linter === 'spell' && message.range && message.range.containsPoint(bufferPosition)) {
                return message.intentions
              }
            }
          }
        }
        return []
      }
    }
  },

  provideLinter () {
    return {
      name: 'spell',
      grammarScopes: ['*'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor, scopeName) => {
        let messages = []
        const grammar = this.getGrammar(textEditor.getGrammar().scopeName)
        if (grammar) {
          const filePath = textEditor.getPath()

          const dictionaries = _.find([
            grammar.getDictionaries ? grammar.getDictionaries(textEditor) : [],
            atom.config.get('linter-spell.defaultDictionaries'),
            [this.locale]
          ], d => d.length > 0)

          const checker = this.getChecker(dictionaries)

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

          for (let checkRange of ranges) {
            for (const { text, range, suggestions } of await checker.getMisspellings(textEditor, checkRange)) {
              const intentions = _.concat(_.map(suggestions,
                (suggestion, index) => {
                  return {
                    priority: -index,
                    icon: 'light-bulb',
                    title: `Change to "${suggestion}"`,
                    selected: () => textEditor.setTextInBufferRange(range, suggestion)
                  }
                }), {
                  priority: -100,
                  icon: 'check',
                  title: 'Add word',
                  selected: () => checker.addWord(text)
                }, {
                  priority: -101,
                  icon: 'check',
                  title: 'Add word (case insensitive)',
                  selected: () => checker.addWordCaseInsensitive(text)
                }, {
                  priority: -102,
                  icon: 'circle-slash',
                  title: 'Ignore word',
                  selected: () => checker.ignoreWord(text)
                }, {
                  priority: -103,
                  icon: 'circle-slash',
                  title: 'Ignore word (case insensitive)',
                  selected: () => checker.ignoreWordCaseInsensitive(text)
                })
              messages.push({
                type: 'Warning',
                text: `${text}: ${suggestions.join(', ')}`,
                range: range,
                intentions: intentions,
                filePath: filePath
              })
            }
          }
        }
        return _.sortBy(messages, 'range')
      }
    }
  }
}

export default Main
