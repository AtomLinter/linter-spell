'use babel'

import * as _ from 'lodash'
import * as path from 'path'
import * as helper from 'atom-linter'
import * as likelySubtags from './likely-subtags'
var tags = require('language-tags')
import { Disposable, Emitter, CompositeDisposable } from 'atom'
import Spell from './spell'

export default class LanguageManager extends Disposable {

  constructor () {
    super(() => {
      this.disposables.dispose()
      this.checkers = new Map()
    })
    this.disposables = new CompositeDisposable()
    this.checkers = new Map()
    this.systemLanguages = ['en-US']
    require('os-locale')((err, locale) => {
      if (!err) {
        this.systemLanguages = [locale.replace(/_/g, '-')] || this.systemLanguages
      }
    })
    this.emitter = new Emitter()
    this.disposables.add(this.emitter)
    this.dictionaries = new Map()
    this.languages = new Map()
    atom.config.onDidChange('linter-spell.spellPath', () => {
      this.checkers = new Map()
      this.updateDictionaries()
    })
    atom.config.onDidChange('linter-spell.defaultLanguages', () => {
      this.updateConfigLanguages()
    })
    this.updateDictionaries()
    this.updateConfigLanguages()
  }

  getAvailableLanguages () {
    let l = []
    for (const lang of this.dictionaries.keys()) {
      l.push(lang.replace(/-\*/g, ''))
    }
    l.sort()
    return l
  }

  getChecker (languages) {
    let id = languages.join()
    if (this.checkers.has(id)) return this.checkers.get(id)

    let checker = new Spell(languages)
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
  }

  updateConfigLanguages () {
    this.configLanguages = atom.config.get('linter-spell.defaultLanguages')
    if (this.configLanguages.length === 0) {
      this.configLanguages = null
    }
  }

  parse (name) {
    let parts = name.split(/[-_]/)
    let i = 0
    let lang = []
    for (const type of ['language', 'extlang', 'script', 'region', 'variant']) {
      if (i < parts.length) {
        lang.push((tags.type(parts[i], type) && (type !== 'region' || parts[i].match(/^[A-Z]+$/))) ? parts[i++] : '*')
      }
    }
    return _.dropRightWhile(lang, p => p === '*').join('-') || '*'
  }

  maximizeRank (tag) {
    let rank = 0
    let value
    for (const entry of this.dictionaries.entries()) {
      const newRank = this.rank(entry[0], tag)
      if (newRank > rank) {
        rank = newRank
        value = entry
      }
    }
    return value
  }

  onDidChangeLanguages (callback) {
    return this.emitter.on('change-languages', callback)
  }

  getLanguages (textEditor, type) {
    let l = this.languages.get(textEditor)
    if (!l) {
      global.grammarManager.updateLanguage(textEditor)
      l = this.languages.get(textEditor)
      if (!l) {
        if (global.grammarManager.getGrammar(textEditor)) {
          this.languages.set(textEditor, l = {})
        } else {
          return
        }
      }
    }
    return type ? l[type] : (l.manual || l.auto || this.configLanguages || this.systemLanguages)
  }

  setLanguages (textEditor, languages, type) {
    let l = this.languages.get(textEditor) || {}
    l[type] = languages
    this.languages.set(textEditor, l)
    this.emitter.emit('change-languages', null)
  }

  resolve (languages, notify) {
    let d = []
    for (const language of languages) {
      const fallback = likelySubtags[language]
      let dict = this.maximizeRank(language)
      if (fallback) dict = dict || this.maximizeRank(fallback)
      if (dict) {
        d.push(dict)
      } else if (notify) {
        atom.notifications.addWarning(
          'Missing Dictionary', {
            detail: `Unable to find a dictionary for language ${language}${fallback ? ' with fallback ' + fallback : ''}.`
          })
      }
    }
    return d
  }

  resolveDictionaries (languages) {
    return _.map(this.resolve(languages, true), entry => entry[1])
  }

  resolveLanguages (languages) {
    return _.map(this.resolve(languages, false), entry => entry[0].replace(/-\*/g, ''))
  }

  addDictionary (name) {
    const lang = this.parse(name)
    if (lang !== '*' && (!this.dictionaries.has(lang) || name < this.dictionaries.get(lang))) {
      this.dictionaries.set(lang, name)
    }
  }

  async updateDictionaries () {
    const spellPath = atom.config.get('linter-spell.spellPath')
    const ispell = path.parse(spellPath).name.toLowerCase()
    let output = ''
    this.dictionaries.clear()
    switch (ispell) {
      case 'aspell':
        output = await helper.exec(spellPath, ['dicts'], { stream: 'stdout' })
        for (const line of output.split(/[\r\n]+/g)) {
          this.addDictionary(line)
        }
        break
      case 'hunspell':
        output = await helper.exec(spellPath, ['-D'], { stream: 'stderr', stdin: '', throwOnStdErr: false })
        let save = false
        for (const line of output.split(/[\r\n]+/g)) {
          if (line.match(/AVAILABLE DICTIONARIES/)) {
            save = true
          } else if (line.match(/:$/)) {
            save = false
          } else if (save) {
            this.addDictionary(path.basename(line))
          }
        }
        break
    }
    this.emitter.emit('change-languages', null)
  }

  rank (range, tag) {
    // From https://tools.ietf.org/html/rfc4647
    range = range.toLowerCase().split(/[-_]/)
    tag = tag.toLowerCase().split(/[-_]/)
    let rank = 1
    // Split both the extended language range and the language tag being
    // compared into a list of subtags by dividing on the hyphen (%x2D)
    // character.  Two subtags match if either they are the same when
    // compared case-insensitively or the language range's subtag is the
    // wildcard '*'.

    // Begin with the first subtag in each list.  If the first subtag in
    // the range does not match the first subtag in the tag, the overall
    // match fails.  Otherwise, move to the next subtag in both the
    // range and the tag.
    if (range[0] !== '*' && range[0] !== tag[0]) {
      return 0
    }

    // While there are more subtags left in the language range's list:
    for (let i = 1, j = 1; i < range.length;) {
      if (range[i] === '*') {
        // If the subtag currently being examined in the range is the
        // wildcard ('*'), move to the next subtag in the range and
        // continue with the loop.
        i++
      } else if (j >= tag.length) {
        // Else, if there are no more subtags in the language tag's
        // list, the match fails.
        return 0
      } else if (range[i] === '*' || range[i] === tag[j]) {
        // Else, if the current subtag in the range's list matches the
        // current subtag in the language tag's list, move to the next
        // subtag in both lists and continue with the loop.
        if (range[i] !== '*') rank += Math.pow(2, i)
        i++
        j++
      } else if (tag[j].length === 1) {
        // Else, if the language tag's subtag is a "singleton" (a single
        // letter or digit, which includes the private-use subtag 'x')
        // the match fails.
        return 0
      } else {
        // Else, move to the next subtag in the language tag's list and
        // continue with the loop.
        j++
      }
    }

    return rank
  }

}
