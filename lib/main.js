'use babel'

import { Point, Range, Disposable, CompositeDisposable } from 'atom'
import * as _ from 'lodash'
import Spell from './spell'

function escapeRegExp (str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

function getScopePath (scopeDescriptor) {
  return _.map(scopeDescriptor.getScopesArray(), scope => scope[0] !== '.' ? '.' + scope : scope).join(' ')
}

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
    this.ignoredScopes = {}
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
        'text.git-commit',
        'text.plain',
        'text.plain.null-grammar'],
      ignoredScopes: []
    }, {
      grammarScopes: ['source.gfm'],
      ignoredScopes: [
        '.link .markup.underline.link.gfm',
        '.markup.raw.gfm',
        'constant.character.entity.gfm'
      ]
    }]
  },

  consumeGrammar (grammars) {
    grammars = _.castArray(grammars)
    for (const grammar of grammars) {
      this.grammars.add(grammar)
      if (grammar.ignoredScopes) {
        grammar._ignoredPattern =
          new RegExp(
            '(?:^| )(?:' +
            _.map(grammar.ignoredScopes, escapeRegExp).join('|') +
            ')(?:$| )')
//        console.log(grammar._ignoredPattern)
      }
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

          let ranges = [textEditor.getBuffer().getRange()]
          if (grammar._ignoredPattern !== null) {
            let current = Point.fromObject(ranges[ranges.length - 1].start, true)
            while (ranges[ranges.length - 1].containsPoint(current)) {
              let next = Point.fromObject(current, true)
              let path = getScopePath(textEditor.scopeDescriptorForBufferPosition(current))
              do {
                if (textEditor.getBuffer().lineLengthForRow(next.row) === next.column) {
                  next.row++
                  next.column = 0
                } else {
                  next.column++
                }
              } while (ranges[ranges.length - 1].containsPoint(next) && path === getScopePath(textEditor.scopeDescriptorForBufferPosition(next)))
//              console.log(path)
              if (grammar._ignoredPattern.test(path)) {
                if (current === ranges[ranges.length - 1].start) {
                  ranges[ranges.length - 1].start = next
                } else {
                  let r = new Range(next, ranges[ranges.length - 1].end)
                  ranges[ranges.length - 1].end = current
//                  console.log(ranges[ranges.length - 1].isEmpty())
                  ranges.push(r)
                }
              }
              current = next
            }
          }

          _.remove(ranges, range => range.isEmpty())

          if (ranges.length > 0 && grammar.getRamges) {
            let {ranges, ignoredRanges} = grammar.getRanges(textEditor, ranges)

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
          }

//          console.log(ranges)

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
