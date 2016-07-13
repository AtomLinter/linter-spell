'use babel'

import { Point, Range, Disposable, CompositeDisposable } from 'atom'
import * as _ from 'lodash'

const linterName = 'Spelling'
const asciiDocLangPattern = /^:lang:\s*(\S+)/m

const Main = {
  disposables: null,
  linter: null,
  locale: null,
  grammars: null,
  checkedScopes: null,
  languageStatusView: null,

  getGrammar (scope) {
    for (const grammar of this.grammars.values()) {
      if (_.includes(grammar.grammarScopes, scope)) {
        return grammar
      }
    }
  },

  consumeStatusBar (statusBar) {
    const encodings = {
      utf8: {
        list: 'UTF-8',
        status: 'UTF-8'
      },
      utf16le: {
        list: 'UTF-16 LE',
        status: 'UTF-16 LE'
      },
      utf16be: {
        list: 'UTF-16 BE',
        status: 'UTF-16 BE'
      },
      windows1252: {
        list: 'Western (Windows 1252)',
        status: 'Windows 1252'
      }
    }
    LanguageStatusView = require('./language-status-view')
    this.languageStatusView = new LanguageStatusView()
    this.languageStatusView.initialize(statusBar, encodings)
    this.languageStatusView.attach()
  },

  activate () {
    this.disposables = new CompositeDisposable()
    var LanguageManager = require('./language-manager')
    global.languageManager = new LanguageManager()
    this.disposables.add(global.languageManager)
    this.grammars = new Set()
    this.checkedScopes = new Map()
    require('atom-package-deps').install('linter-spell')
      .then(() => {
        console.log('All dependencies installed, good to go')
      })
  },

  deactivate () {
    this.disposables.dispose()
    this.languageStatusView.destroy()
    this.languageStatusView = null
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
      findLanguageTags: textEditor => {
        let languages = []
        textEditor.scan(asciiDocLangPattern, ({match, stop}) => {
          languages.push(match[1])
          stop()
        })
        return languages
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

          if (grammar.findLanguageTags) {
            const l = grammar.findLanguageTags(textEditor)
            global.languageManager.setLanguages(textEditor, (l && l.length > 0) ? l : null, 'auto')
          }
          const languages = global.languageManager.getLanguages(textEditor)
          // const languages =
          //   grammar.findLanguageTags ? grammar.findLanguageTags(textEditor) : atom.config.get('linter-spell.defaultLanguages')

          const checker = global.languageManager.getChecker(languages)
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

            if (ranges.length > 0 && grammar.filterRanges) {
              let result = grammar.filterRanges(textEditor, ranges)
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
