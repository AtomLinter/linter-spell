'use babel'

import { Point, Range, Disposable, CompositeDisposable } from 'atom'
import * as _ from 'lodash'
import Spell from './spell'
var tags = require('language-tags')

const linterName = 'Spelling'
const asciiDocLangPattern = /^:lang:\s*(\S+)/m

const Main = {
  disposables: null,
  linter: null,
  locale: null,
  grammars: null,
  checkedScopes: null,
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
    if (this.checkers.has(id)) return this.checkers.get(id)

    let checker = new Spell(dictionaries)
    this.disposables.add(checker)
    this.checkers.set(id, checker)
    checker.onError(err => {
      console.error(err)
      if (this.checkers.has(id)) {
        this.checkers.delete(id)
        atom.notifications.addError(
          'Spell Checker Communication Error',
          { detail: `Unable to communicate with spell checker. Please verify your settings of linter-spell.\n${err}` })
      }
    })
    return checker
  },

  activate () {
    Spell.updateLanguages()
    this.disposables = new CompositeDisposable()
    this.locale = 'en_US'
    require('os-locale')((err, locale) => {
      if (!err) {
        this.locale = locale || this.locale
      }
    })
    this.grammars = new Set()
    this.checkedScopes = new Map()
    this.checkers = new Map()
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
        'text.plain',
        'text.plain.null-grammar']
    }, {
      grammarScopes: ['text.git-commit'],
      checkedScopes: {
        '.meta.scope.message.git-commit': true
      }
    }, {
      grammarScopes: ['source.asciidoc'],
      getDictionaries: textEditor => {
        let dictionaries = []
        textEditor.scan(asciiDocLangPattern, ({match, stop}) => {
          dictionaries.push(match[1])
          stop()
        })
        return dictionaries
      },
      checkedScopes: {
        'source.asciidoc': true,
        'entity.name.function.asciidoc': false,
        'entity.name.tag.yaml': false,
        'markup.blockid.asciidoc': false,
        'markup.link.asciidoc': false,
        'markup.raw.asciidoc': false,
        'markup.raw.monospace.asciidoc': false,
        'support.constant.attribute-name.asciidoc': false
      }
    }, {
      grammarScopes: ['source.gfm'],
      checkedScopes: {
        'source.gfm': true,
        'markup.underline.link.gfm': false,
        'markup.raw.gfm': false,
        'constant.character.entity.gfm': false
      }
    }]
  },

  isIgnored (scopeDescriptor) {
    let path = scopeDescriptor.getScopesArray()
    let i = path.length
    while (i--) {
      if (this.checkedScopes.has(path[i])) {
        return this.checkedScopes.get(path[i]) < 0
      }
    }
    return true
  },

  scopeVote (scope, vote) {
    vote += this.checkedScopes.get(scope) || 0
    if (vote === 0) {
      this.checkedScopes.delete(scope)
    } else {
      this.checkedScopes.set(scope, vote)
    }
  },

  grammarScopeVotes (grammar, falseVote, trueVote) {
    if (grammar.checkedScopes) {
      _.forEach(grammar.checkedScopes, (value, key) => this.scopeVote(key, value ? trueVote : falseVote))
    } else {
      _.forEach(grammar.grammarScopes, key => this.scopeVote(key, trueVote))
    }
  },

  consumeGrammar (grammars) {
    grammars = _.castArray(grammars)
    for (const grammar of grammars) {
      this.grammars.add(grammar)
      this.grammarScopeVotes(grammar, -1, 1)
    }
    return new Disposable(() => {
      for (const grammar of grammars) {
        this.grammars.delete(grammar)
        this.grammarScopeVotes(grammar, 1, -1)
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
              if (message.linter === linterName && message.range && message.range.containsPoint(bufferPosition)) {
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
      name: linterName,
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
            [this.locale.replace('_', '-')]
          ], d => d.length > 0)

          const checker = this.getChecker(dictionaries)
          if (checker !== null) {
            let ranges = [textEditor.getBuffer().getRange()]
            let current = Point.fromObject(ranges[ranges.length - 1].start, true)

            while (ranges[ranges.length - 1].containsPoint(current)) {
              let next = Point.fromObject(current, true)
              let scopeDescriptor = textEditor.scopeDescriptorForBufferPosition(current)
              do {
                if (textEditor.getBuffer().lineLengthForRow(next.row) === next.column) {
                  next.row++
                  next.column = 0
                } else {
                  next.column++
                }
              } while (ranges[ranges.length - 1].containsPoint(next) && _.isEqual(scopeDescriptor.getScopesArray(), textEditor.scopeDescriptorForBufferPosition(next).getScopesArray()))
              if (this.isIgnored(scopeDescriptor)) {
                if (current === ranges[ranges.length - 1].start) {
                  ranges[ranges.length - 1].start = Point.fromObject(next, true)
                } else {
                  let r = new Range(Point.fromObject(next, true), Point.fromObject(ranges[ranges.length - 1].end, true))
                  ranges[ranges.length - 1].end = Point.fromObject(current, true)
                  if (r.end.row < textEditor.getLineCount()) {
                    ranges.push(r)
                  }
                }
              }
              current = next
            }

            if (ranges.length > 0 && grammar.getRanges) {
              let result = grammar.getRanges(textEditor, ranges)
              ranges = result.ranges

              for (const ignoredRange of (result.ignoredRanges || [])) {
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

            _.remove(ranges, range => range.isEmpty())

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
                    selected: () => checker.addWord(text, true)
                  }, {
                    priority: -101,
                    icon: 'check',
                    title: 'Add word (case insensitive)',
                    selected: () => checker.addWord(text, false)
                  }, {
                    priority: -102,
                    icon: 'circle-slash',
                    title: 'Ignore word',
                    selected: () => checker.ignoreWord(text, true)
                  }, {
                    priority: -103,
                    icon: 'circle-slash',
                    title: 'Ignore word (case insensitive)',
                    selected: () => checker.ignoreWord(text, false)
                  })
                messages.push({
                  type: 'Warning',
                  text: `${text} -> ${suggestions.join(', ')}`,
                  range: range,
                  intentions: intentions,
                  filePath: filePath
                })
              }
            }
          }
        }
        return _.sortBy(messages, 'range')
      }
    }
  }
}

export default Main
