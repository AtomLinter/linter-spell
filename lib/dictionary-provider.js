'use babel'

import * as _ from 'lodash'
import * as helpers from './language-helpers'
import * as path from 'path'
var tags = require('language-tags')
import * as helper from 'atom-linter'
import * as likelySubtags from './likely-subtags'
import { Range, Disposable, Emitter } from 'atom'
import Spell from './spell'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

export default class DictionaryProvider extends Disposable {

  constructor () {
    super(() => {
      this.disposables.dispose()
      this.checkers = new Map()
    })
    this.disposables = new CompositeDisposable()
    this.checkers = new Map()
    this.dictionaries = new Map()
    atom.config.onDidChange('linter-spell.spellPath', () => {
      this.checkers = new Map()
      this.updateDictionaries()
    })
    this.updateDictionaries()
  }

  provideDictionary () {
    return [{
      name: 'Ispell dictionary',
      languages: this.getAvailableLanguages(),
      checkWord: (textEditor, languages, range) => {
        const checker = this.getChecker(languages)
        if (!checker) return { isWord: false }
        const word = textEditor.getTextInBufferRange(range)
        checker.getMisspellings(textEditor, range)
          .then(misspellings => (misspellings.length === 0)
            ? { isWord: true }
            : {
              isWord: false,
              suggestions: misspellings[0].suggestions,
              actions: [{
                title: 'Add to personal dictionary',
                apply: () => checker.addWord(word, false)
              }, {
                title: 'Add to personal dictionary (case sensitive)',
                apply: () => checker.addWord(word, true)
              }, {
                title: 'Ignore',
                apply: () => checker.ignoreWord(word, false)
              }, {
                title: 'Ignore (case sensitive)',
                apply: () => checker.ignoreWord(word, true)
              }]
            })
        }
    }]
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

  maximizeRank (tag) {
    let rank = 0
    let value
    for (const entry of this.dictionaries.entries()) {
      const newRank = helpers.rankRange(entry[0], tag)
      if (newRank > rank) {
        rank = newRank
        value = entry
      }
    }
    return value
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
    const lang = helpers.parseRange(name)
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

}
