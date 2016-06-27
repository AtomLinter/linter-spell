'use babel'

import childProcess from 'child_process'
import readline from 'readline'
import {Range} from 'atom'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

export default class Spell {
  constructor (dictionaries) {
    this.last = Promise.resolve([])

    let options = ['-a']

    if (dictionaries && dictionaries.length > 0) {
      options.push('-d')
      options.push(dictionaries.join())
    }

    this.process = childProcess.spawn(atom.config.get('linter-spell.spellPath'), options)

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`)
    })

    this.readline = readline.createInterface({
      input: this.process.stdout
    })

    this.process.stdin.write('!\n') // Put into terse mode
  }

  addWord (word) {
    this.process.stdin.write(`*${word}\n`)
  }

  addWordCaseInsensitive (word) {
    this.process.stdin.write(`*${word.toLowerCase()}\n`)
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
      const subRange = new Range([i, i == range.start.row ? range.start.column : 0], [i, i == range.end.row ? range.end.column : textEditor.getBuffer().lineLengthForRow(i)])
      misspellings = _.concat(misspellings, await this.checkLine(subRange.start, textEditor.getTextInBufferRange(subRange)))
    }
    return misspellings
  }

  checkLine (start, text) {
    let foo = this.process
    let bar = this.readline
    function ex (resolve, reject) {
      let words = []
      function onLine (line) {
        function addMisspelling (word, offset, suggestions) {
          words.push({
            original: word,
            range: new Range([start.row, start.column + offset], [start.row, start.column + offset + word.length]),
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
          bar.removeListener('line', onLine)
          resolve(words)
        }
      }
      bar.on('line', onLine)
      foo.stdin.write(text.replace("''", '" ' /* hack */).replace(commandPattern, '^$&') + '\n')
    }
    if (text) {
      this.last = this.last.then(() => { return new Promise(ex) })
      return this.last
    } else {
      return []
    }
  }

}
