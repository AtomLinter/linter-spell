'use babel'

import * as _ from 'lodash'
import * as helpers from './language-helpers'
import * as path from 'path'
import childProcess from 'child_process'
import * as likelySubtags from './likely-subtags'
import { Disposable, CompositeDisposable } from 'atom'
import { Spell, constructProcessOptions } from './spell'

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
    this.provider = {
      name: 'Ispell dictionary',
      languages: this.getAvailableLanguages(),
      checkRange: (textEditor, languages, range) => {
        const checker = this.getChecker(languages)
        if (!checker) return []
        return checker.getMisspellings(textEditor, range)
          .then(misspellings => _.map(misspellings,
            misspelling => {
              const word = textEditor.getTextInBufferRange(misspelling.range)
              const upperCase = word.toLowerCase() !== word

              const result = {
                range: misspelling.range,
                suggestions: misspelling.suggestions,
                actions: [{
                  title: 'Ignore',
                  apply: () => checker.ignoreWord(word, false)
                }]
              }

              if (upperCase) {
                result.actions.push({
                  title: 'Ignore (case sensitive)',
                  apply: () => checker.ignoreWord(word, true)
                })
              }

              result.actions.push({
                title: 'Add to personal dictionary',
                apply: () => checker.addWord(word, false)
              })

              if (upperCase) {
                result.actions.push({
                  title: 'Add to personal dictionary (case sensitive)',
                  apply: () => checker.addWord(word, true)
                })
              }

              return result
            }))
      },
      checkWord: (textEditor, languages, range) => {
        const checker = this.getChecker(languages)
        if (!checker) return { isWord: false }
        const word = textEditor.getTextInBufferRange(range)
        return checker.getMisspellings(textEditor, range)
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
    }
    this.updateDictionaries()
  }

  provideDictionary () {
    return this.provider
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
    let processOptions
    this.dictionaries.clear()
    switch (ispell) {
      case 'aspell':
        processOptions = constructProcessOptions()
        output = childProcess.spawnSync(spellPath, ['dicts'], processOptions)
        if (output.status !== 0) {
          atom.notifications.addError('linter-spell: Dictionary request failed', { description: `Call to aspell failed with a code of ${output.status}.` })
        }
        if (output.stdout) {
          for (const line of output.stdout.split(/[\r\n]+/g)) {
            this.addDictionary(line)
          }
        }
        break
      case 'hunspell':
        processOptions = constructProcessOptions({ input: '' })
        output = childProcess.spawnSync(spellPath, ['-D'], processOptions)
        if (output.status !== 0) {
          atom.notifications.addError('linter-spell: Dictionary request failed', { description: `Call to hunspell failed with a code of ${output.status}.` })
        }
        if (output.stderr) {
          let save = false
          for (const line of output.stderr.split(/[\r\n]+/g)) {
            if (line.match(/\s-d.*:$/)) {
              save = true
            } else if (line.match(/:$/)) {
              save = false
            } else if (save) {
              this.addDictionary(path.basename(line))
            }
          }
        }
        break
    }
    this.provider.languages = this.getAvailableLanguages()
//    this.emitter.emit('change-languages', null)
  }

}
