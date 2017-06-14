'use babel'

import { Point, Range } from 'atom'
import * as _ from 'lodash'
const asciiDocLangPattern = /^:lang:\s*(\S+)/m

export function provideGrammar () {
  return [{
    grammarScopes: [
      'text.plain',
      'text.plain.null-grammar'
    ],
    checkedScopes: {
      'text.plain': true,
      'text.plain.null-grammar': true,
      'storage.type.class.todo': false, // ignore from language-todo
      'storage.type.class.fixme': false,
      'storage.type.class.changed': false,
      'storage.type.class.xxx': false,
      'storage.type.class.idea': false,
      'storage.type.class.hack': false,
      'storage.type.class.note': false,
      'storage.type.class.review': false,
      'storage.type.class.nb': false,
      'storage.type.class.bug': false,
      'storage.type.class.radar': false,
      'markup.underline.link.http.hyperlink': false, // ignore from language-hyperlink
      'markup.underline.link.https.hyperlink': false,
      'markup.underline.link.sftp.hyperlink': false,
      'markup.underline.link.ftp.hyperlink': false,
      'markup.underline.link.file.hyperlink': false,
      'markup.underline.link.smb.hyperlink': false,
      'markup.underline.link.afp.hyperlink': false,
      'markup.underline.link.nfs.hyperlink': false,
      'markup.underline.link.x-man-page.hyperlink': false,
      'markup.underline.link.x-man.hyperlink': false,
      'markup.underline.link.man-page.hyperlink': false,
      'markup.underline.link.man.hyperlink': false,
      'markup.underline.link.gopher.hyperlink': false,
      'markup.underline.link.txmnt.hyperlink': false,
      'markup.underline.link.issue.hyperlink': false,
      'markup.underline.link..hyperlink': false
    }
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
      'markup.code.asciidoc.properties.asciidoc': false,
      'markup.code.c.asciidoc': false,
      'markup.code.clojure.asciidoc': false,
      'markup.code.coffee.asciidoc': false,
      'markup.code.cpp.asciidoc': false,
      'markup.code.cs.asciidoc': false,
      'markup.code.css.asciidoc': false,
      'markup.code.css.less.asciidoc': false,
      'markup.code.css.scss.asciidoc': false,
      'markup.code.diff.asciidoc': false,
      'markup.code.dockerfile.asciidoc': false,
      'markup.code.elixir.asciidoc': false,
      'markup.code.elm.asciidoc': false,
      'markup.code.erlang.asciidoc': false,
      'markup.code.gfm.asciidoc': false,
      'markup.code.go.asciidoc': false,
      'markup.code.groovy.asciidoc': false,
      'markup.code.haskell.asciidoc': false,
      'markup.code.html.basic.asciidoc': false,
      'markup.code.html.mustache.asciidoc': false,
      'markup.code.html.php.asciidoc': false,
      'markup.code.java.asciidoc': false,
      'markup.code.js.asciidoc': false,
      'markup.code.js.jsx.asciidoc': false,
      'markup.code.json.asciidoc': false,
      'markup.code.julia.asciidoc': false,
      'markup.code.makefile.asciidoc': false,
      'markup.code.objc.asciidoc': false,
      'markup.code.ocaml.asciidoc': false,
      'markup.code.perl.asciidoc': false,
      'markup.code.perl6.asciidoc': false,
      'markup.code.python.asciidoc': false,
      'markup.code.r.asciidoc': false,
      'markup.code.ruby.asciidoc': false,
      'markup.code.rust.asciidoc': false,
      'markup.code.sass.asciidoc': false,
      'markup.code.scala.asciidoc': false,
      'markup.code.shell.asciidoc': false,
      'markup.code.sql.asciidoc': false,
      'markup.code.swift.asciidoc': false,
      'markup.code.toml.asciidoc': false,
      'markup.code.ts.asciidoc': false,
      'markup.code.xml.asciidoc': false,
      'markup.code.yaml.asciidoc': false,
      'markup.link.asciidoc': false,
      'markup.raw.asciidoc': false,
      'markup.raw.monospace.asciidoc': false,
      'source.asciidoc': true,
      'support.constant.attribute-name.asciidoc': false
    }
  }, {
    grammarScopes: [
      'source.gfm' // language-gfm
      // The following are not included since filterRanges is not needed
      // source.embedded.gfm from language-asciidoc
      // text.embedded.md from language-gfm
    ],
    checkedScopes: {
      'constant.character.entity.gfm': false,
      'constant.character.escape.gfm': false,
      'front-matter.yaml.gfm': false,
      'markup.code.c.gfm': false,
      'markup.code.clojure.gfm': false,
      'markup.code.coffee.gfm': false,
      'markup.code.cpp.gfm': false,
      'markup.code.cs.gfm': false,
      'markup.code.css.gfm': false,
      'markup.code.diff.gfm': false,
      'markup.code.elixir.gfm': false,
      'markup.code.elm.gfm': false,
      'markup.code.erlang.gfm': false,
      'markup.code.gfm': false,
      'markup.code.go.gfm': false,
      'markup.code.haskell.gfm': false,
      'markup.code.html.gfm': false,
      'markup.code.java.gfm': false,
      'markup.code.js.gfm': false,
      'markup.code.json.gfm': false,
      'markup.code.julia.gfm': false,
      'markup.code.less.gfm': false,
      'markup.code.objc.gfm': false,
      'markup.code.php.gfm': false,
      'markup.code.python.console.gfm': false,
      'markup.code.python.gfm': false,
      'markup.code.r.gfm': false,
      'markup.code.ruby.gfm': false,
      'markup.code.rust.gfm': false,
      'markup.code.scala.gfm': false,
      'markup.code.shell.gfm': false,
      'markup.code.sql.gfm': false,
      'markup.code.swift.gfm': false,
      'markup.code.xml.gfm': false,
      'markup.code.yaml.gfm': false,
      'markup.raw.gfm': false,
      'markup.underline.link.gfm': false,
      'source.gfm': true,
      'string.emoji.gfm': false,
      'string.issue.number.gfm': false,
      'string.username.gfm': false,
      'text.embedded.md': true,
      'variable.issue.tag.gfm': false,
      'variable.mention.gfm': false
    }
  }, {
    grammarScopes: [
      'text.md' // language-markdown
      // The following are not included since filterRanges is not needed
      // embedded.text.md from language-markdown
    ],
    checkedScopes: {
      'abbreviation.reference.link.markup.md': false,
      'class.method.reference.gfm.variable.md': false,
      'class.reference.gfm.variable.md': false,
      'code.raw.markup.md': false,
      'embedded.text.md': true,
      'emoji.constant.gfm.md': false,
      'entity.constant.md': false,
      'fenced.code.md': false,
      'front-matter.toml.source.md': false,
      'front-matter.yaml.source.md': false,
      'instance.method.reference.gfm.variable.md': false,
      'issue.gfm.md': false,
      'reference.gfm.variable.md': false,
      'rmarkdown.attribute.meta.md': false,
      'special-attributes.raw.markup.md': false,
      'text.md': true,
      'uri.underline.link.md': false
    }
  }]
}

export function provideLinter () {
  return {
    name: 'Spelling',
    scope: 'file',
    grammarScopes: ['*'],
    lintsOnChange: false,
    lint: async (textEditor, scopeName) => {
      let messages = []
      global.grammarManager.updateLanguage(textEditor)
      const grammar = global.grammarManager.getGrammar(textEditor)
      if (grammar) {
        const filePath = textEditor.getPath()
        const languages = global.languageManager.getLanguages(textEditor)
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
          if (embeddedGrammar && embeddedGrammar.filterRanges) {
            const embeddedFiltered = embeddedGrammar.filterRanges(textEditor, ranges)
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
          const misspellings = await global.dictionaryManager.checkRange(textEditor, languages, checkRange)
          for (const misspelling of misspellings) {
            let word = textEditor.getTextInBufferRange(misspelling.range)
            let solutions = []
            if (misspelling.suggestions) {
              solutions = _.map(misspelling.suggestions,
              (suggestion, index) => ({
                title: `Change to "${suggestion}"`,
                position: misspelling.range,
                apply: () => textEditor.setTextInBufferRange(misspelling.range, suggestion)
              }))
            }
            if (misspelling.actions) {
              solutions = _.concat(solutions,
                _.map(misspelling.actions, (action, index) => ({
                  title: action.title,
                  position: misspelling.range,
                  apply: action.apply
                }))
              )
            }
            messages.push({
              severity: atom.config.get('linter-spell.spellingErrorSeverity'),
              excerpt: `${word} -> ${misspelling.suggestions.join(', ')}`,
              location: {
                file: filePath,
                position: misspelling.range,
              },
              solutions,
            })
          }
        }
      }
      return _.sortBy(messages, 'range')
    }
  }
}
