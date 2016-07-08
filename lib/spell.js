'use babel'

import * as _ from 'lodash'
import childProcess from 'child_process'
import readline from 'readline'
import { Range, Disposable, Emitter } from 'atom'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

export default class Spell extends Disposable {
  constructor (dictionaries) {
    super(() => {
      this.process.stdin.end()
    })
    this.emitter = new Emitter()
    this.last = Promise.resolve([])

    let options = ['-a']

    if (dictionaries && dictionaries.length > 0) {
      options.push('-d')
      options.push(dictionaries.join())
    }

    const personalDictionaryPath = atom.config.get('linter-spell.personalDictionaryPath')
    if (personalDictionaryPath) {
      options.push('-p')
      options.push(personalDictionaryPath)
    }

    this.process = childProcess.spawn(atom.config.get('linter-spell.spellPath'), options)

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

  addWord (word) {
    this.process.stdin.write(`*${word}\n#\n`)
  }

  addWordCaseInsensitive (word) {
    this.process.stdin.write(`*${word.toLowerCase()}\n#\n`)
  }

  ignoreWord (word) {
    this.process.stdin.write(`@${word}\n`)
  }

  ignoreWordCaseInsensitive (word) {
    this.process.stdin.write(`@${word.toLowerCase()}\n`)
  }

  async getMisspellings (textEditor, range) {
    let misspellings = []
    for (let i = range.start.row; i <= range.end.row; i++) {
      const subRange = new Range([i, i === range.start.row ? range.start.column : 0], [i, i === range.end.row ? range.end.column : textEditor.getBuffer().lineLengthForRow(i)])
      misspellings = _.concat(misspellings, await this.checkLine(subRange.start, textEditor.getTextInBufferRange(subRange)))
    }
    return misspellings
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
