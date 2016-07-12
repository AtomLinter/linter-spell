'use babel'

import * as _ from 'lodash'
import * as path from 'path'
import childProcess from 'child_process'
import readline from 'readline'
import { Range, Disposable, Emitter } from 'atom'
import * as likelySubtags from './likely-subtags'
import * as helper from 'atom-linter'
import LanguageRange from './language-range'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

let dictionaries = new Map()

export default class Spell extends Disposable {
  constructor (languages) {
    super(() => {
      this.process.stdin.end()
    })
    this.emitter = new Emitter()
    this.last = Promise.resolve([])

    const spellPath = atom.config.get('linter-spell.spellPath')
    this.ispell = path.parse(spellPath).name.toLowerCase()

    let options = ['-a']

    if (languages && languages.length > 0) {
      let d = []
      for (const language of languages) {
        const fallback = likelySubtags[language]
        let dict = LanguageRange.maximizeRank(dictionaries, language)
        if (fallback) dict = dict || LanguageRange.maximizeRank(dictionaries, fallback)
        if (dict) {
          d.push(dict)
        } else {
          atom.notifications.addWarning(
            'Missing Dictionary', {
              detail: `Unable to find a dictionary for language ${language}${fallback ? ' with fallback ' + fallback : ''}.`
            })
        }
      }
      if (d.length > 0) {
        switch (this.ispell) {
          case 'aspell': // Aspell needs extra dictionaries listed separately
            options.push('-d')
            options.push(d[0])
            if (d.length > 1) {
              options.push(`--extra-dicts=${d.slice(1).join()}`)
            }
            break
          case 'hunspell':
            options.push('-d')
            options.push(d.join())
            break
          default: // Ispell only likes one dictionary
            options.push('-d')
            options.push(d[0])
            break
        }
      }
    }

    const personalDictionaryPath = atom.config.get('linter-spell.personalDictionaryPath')
    if (personalDictionaryPath) {
      options.push('-p')
      options.push(personalDictionaryPath)
    }

    this.process = childProcess.spawn(spellPath, options)

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`)
    })

    this.process.on('error', err => this.emitter.emit('error', err))
    this.process.stdin.on('error', err => this.emitter.emit('error', err))
    this.process.stdout.on('error', err => this.emitter.emit('error', err))

    this.readline = readline.createInterface({
      input: this.process.stdout
    })

    this.process.stdin.write('!\n') // Put into terse mode
  }

  onError (callback) {
    return this.emitter.on('error', callback)
  }

  addWord (word, respectCase) {
    this.process.stdin.write(`*${respectCase ? word : word.toLowerCase()}\n#\n`)
  }

  ignoreWord (word, respectCase) {
    this.process.stdin.write(`@${respectCase ? word : word.toLowerCase()}\n`)
  }

  async getMisspellings (textEditor, range) {
    let misspellings = []
    for (let i = range.start.row; i <= range.end.row; i++) {
      const subRange = new Range([i, i === range.start.row ? range.start.column : 0], [i, i === range.end.row ? range.end.column : textEditor.getBuffer().lineLengthForRow(i)])
      misspellings = _.concat(misspellings, await this.checkLine(subRange.start, textEditor.getTextInBufferRange(subRange)))
    }
    return misspellings
  }

  static async updateLanguages () {
    const spellPath = atom.config.get('linter-spell.spellPath')
    const ispell = path.parse(spellPath).name.toLowerCase()
    let output = ''
    dictionaries.clear()
    function add (name) {
      const lang = LanguageRange.parse(name)
      if (lang !== '*' && (!dictionaries.has(lang) || name < dictionaries.get(lang))) {
        dictionaries.set(lang, name)
      }
    }
    switch (ispell) {
      case 'aspell':
        output = await helper.exec(spellPath, ['dicts'], { stream: 'stdout' })
        for (const line of output.split(/[\r\n]+/g)) {
          add(line)
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
            add(path.basename(line))
          }
        }
        break
    }
  }

  checkLine (start, text) {
    const padding = commandPattern.test(text) ? 1 : 0
    let ex = (resolve, reject) => {
      let words = []
      let onError = () => {
        this.readline.removeListener('line', onLine)
        this.process.stdin.removeListener('error', onError)
        resolve(words)
      }
      let onLine = (line) => {
        function addMisspelling (word, offset, suggestions) {
          words.push({
            text: word,
            range: new Range([start.row, start.column + offset - padding], [start.row, start.column + offset - padding + word.length]),
            suggestions: suggestions
          })
        }
        if (line) {
          const parts = line.split(separatorPattern)
          switch (parts[0]) {
            case '&':
              addMisspelling(parts[1], parseInt(parts[3], 10), parts.slice(4))
              break
            case '#':
              addMisspelling(parts[1], parseInt(parts[2], 10), [])
          }
        } else {
          this.readline.removeListener('line', onLine)
          this.process.stdin.removeListener('error', onError)
          resolve(words)
        }
      }
      this.readline.on('line', onLine)
      this.process.stdin.on('error', onError)
      this.process.stdin.write(text.replace("''", '" ' /* hack */).replace(commandPattern, '^$&') + '\n')
    }
    if (text) {
      this.last = this.last.then(() => { return new Promise(ex) })
      return this.last
    } else {
      return []
    }
  }

}
