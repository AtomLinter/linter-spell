'use babel'

import { Point, Range } from 'atom'
import * as _ from 'lodash'
const linterName = 'Spelling'
const asciiDocLangPattern = /^:lang:\s*(\S+)/m

export function provideIntentions () {
  return {
    grammarScopes: ['*'],
    getIntentions: ({textEditor, bufferPosition}) => {
      if (global.linter) {
        const editorLinter = global.linter.getEditorLinter(textEditor)
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
}

export function provideGrammar () {
  return [{
    grammarScopes: [
      'text.plain',
      'text.plain.null-grammar']
  }, {
    grammarScopes: [
      'text.git-commit'
    ],
    checkedScopes: {
      '.meta.scope.message.git-commit': true
    }
  }, {
    grammarScopes: [
      'source.asciidoc'
    ],
    findLanguageTags: textEditor => {
      let languages = []
      textEditor.scan(asciiDocLangPattern, ({match, stop}) => {
        languages.push(match[1])
        stop()
      })
      return languages
    },
    checkedScopes: {
      'entity.name.function.asciidoc': false,
      'entity.name.tag.yaml': false,
      'markup.blockid.asciidoc': false,
      'markup.link.asciidoc': false,
      'markup.raw.asciidoc': false,
      'markup.raw.monospace.asciidoc': false,
      'source.asciidoc': true,
      'support.constant.attribute-name.asciidoc': false
    }
  }, {
    grammarScopes: [
      'source.gfm',          // language-gfm
      'source.embedded.gfm', // language-asciidoc
      'text.embedded.md',    // language-gfm
    ],
    checkedScopes: {
      'constant.character.entity.gfm': false,
      'markup.code.js.gfm': false,
      'markup.raw.gfm': false,
      'markup.underline.link.gfm': false,
      'source.gfm': true,
      'text.embedded.md': true
    }
  }, {
    grammarScopes: [
      'text.md',          // language-markdown
      'embedded.text.md'  // language-markdown
    ],
    checkedScopes: {
      'code.raw.markup.md': false,
      'embedded.text.md': true,
      'entity.constant.md': false,
      'fenced.code.md': false,
      'text.md': true,
      'uri.underline.link.md': false
    }
  }]
}

export function provideLinter () {
  return {
    name: linterName,
    grammarScopes: ['*'],
    scope: 'file',
    lintOnFly: false,
    lint: async (textEditor, scopeName) => {
      let messages = []
      global.grammarManager.updateLanguage(textEditor)
      const grammar = global.grammarManager.getGrammar(textEditor)
      if (grammar) {
        const filePath = textEditor.getPath()
        const languages = global.languageManager.getLanguages(textEditor)
        const checker = global.languageManager.getChecker(languages)
        if (checker !== null) {
          let filtered = {
            ranges: [textEditor.getBuffer().getRange()],
            ignoredRanges: []
          }
          let embeddedRanges = new Map()
          let current = Point.fromObject(filtered.ranges[0].start, true)

          while (filtered.ranges[0].containsPoint(current)) {
            let next = Point.fromObject(current, true)
            let scopeDescriptor = textEditor.scopeDescriptorForBufferPosition(current)

            do {
              if (textEditor.getBuffer().lineLengthForRow(next.row) === next.column) {
                next.row++
                next.column = 0
              } else {
                next.column++
              }
            } while (filtered.ranges[0].containsPoint(next) && _.isEqual(scopeDescriptor.getScopesArray(), textEditor.scopeDescriptorForBufferPosition(next).getScopesArray()))

            const isIgnored = global.grammarManager.isIgnored(scopeDescriptor)
            let embeddedGrammar = isIgnored ? null : global.grammarManager.getEmbeddedGrammar(scopeDescriptor)

            if (embeddedGrammar && embeddedGrammar.filterRanges) {
              const g = new Range(Point.fromObject(current, true), Point.fromObject(next, true))
              if (embeddedRanges.has(embeddedGrammar)) {
                embeddedRanges.get(embeddedGrammar).push(g)
              } else {
                embeddedRanges.set(embeddedGrammar, [g])
              }
            } else {
              embeddedGrammar = null
            }

            if (isIgnored || embeddedGrammar) {
              // The current scope is ignored so we need to remove the range
              if (current === filtered.ranges[0].start) {
                // This range started with the current scope so just remove the ignored range from the beginning
                filtered.ranges[0].start = Point.fromObject(next, true)
              } else {
                // This range started with a different scope that was not ignored so we need to preserve the beginning
                let r = new Range(Point.fromObject(next, true), Point.fromObject(filtered.ranges[0].end, true))
                filtered.ranges[0].end = Point.fromObject(current, true)
                if (r.end.row < textEditor.getLineCount()) {
                  filtered.ranges.unshift(r)
                }
              }
            }
            current = next
          }

          if (filtered.ranges.length > 0 && grammar.filterRanges) {
            filtered = grammar.filterRanges(textEditor, filtered.ranges)
          }

          if (!filtered.ranges) filtered.ranges = []
          if (!filtered.ignoredRanges) filtered.ignoredRanges = []

          for (const [embeddedGrammar, ranges] of embeddedRanges.entries()) {
            console.log(embeddedGrammar)
            if (embeddedGrammar && embeddedGrammar.filterRanges) {
              const embeddedFiltered = embeddedGrammar.filterRanges(textEditor, ranges)
              console.log(_.map(embeddedFiltered.ranges, range => textEditor.getTextInBufferRange(range)))
              filtered.ranges = _.concat(filtered.ranges, embeddedFiltered.ranges || [])
              filtered.ignoredRanges = _.concat(filtered.ignoredRanges, embeddedFiltered.ignoredRanges || [])
            } else {
              filtered.ranges.push(ranges)
            }
          }

          for (const ignoredRange of filtered.ignoredRanges) {
            filtered.ranges = _.flatMap(filtered.ranges, range => {
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

          _.remove(filtered.ranges, range => !range || range.isEmpty())

          for (let checkRange of filtered.ranges) {
            for (const { text, range, suggestions } of await checker.getMisspellings(textEditor, checkRange)) {
              const intentions = _.concat([{
                  priority: 4,
                  icon: 'check',
                  title: 'Add word',
                  selected: () => checker.addWord(text, true)
                }, {
                  priority: 3,
                  icon: 'check',
                  title: 'Add word (case insensitive)',
                  selected: () => checker.addWord(text, false)
                }, {
                  priority: 2,
                  icon: 'circle-slash',
                  title: 'Ignore word',
                  selected: () => checker.ignoreWord(text, true)
                }, {
                  priority: 1,
                  icon: 'circle-slash',
                  title: 'Ignore word (case insensitive)',
                  selected: () => checker.ignoreWord(text, false)
                }],
                _.map(suggestions,
                  (suggestion, index) => {
                    return {
                      priority: -index,
                      icon: 'light-bulb',
                      title: `Change to "${suggestion}"`,
                      selected: () => textEditor.setTextInBufferRange(range, suggestion)
                    }
                  }))
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
