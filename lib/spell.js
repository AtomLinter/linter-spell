'use babel'

import * as _ from 'lodash'
import * as path from 'path'
var tags = require('language-tags')
import childProcess from 'child_process'
import readline from 'readline'
import { Range, Disposable, Emitter } from 'atom'
import * as likelySubtags from './likely-subtags'
import * as helper from 'atom-linter'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

let languages = new Map()

function rangeMatch(range, tag) {
  // From https://tools.ietf.org/html/rfc4647
  range = range.toLowerCase().split('-')
  tag = tag.toLowerCase().split('-')
  // Split both the extended language range and the language tag being
  // compared into a list of subtags by dividing on the hyphen (%x2D)
  // character.  Two subtags match if either they are the same when
  // compared case-insensitively or the language range's subtag is the
  // wildcard '*'.

  // Begin with the first subtag in each list.  If the first subtag in
  // the range does not match the first subtag in the tag, the overall
  // match fails.  Otherwise, move to the next subtag in both the
  // range and the tag.
  if (range[0] !== '*' && range[0] !== tag[0])
    return false

  // While there are more subtags left in the language range's list:
  for (let i = 1, j = 1; i < range.length; ) {
    if (range[i] === '*') {
      // If the subtag currently being examined in the range is the
      // wildcard ('*'), move to the next subtag in the range and
      // continue with the loop.
      i++
    } else if (j >= tag.length) {
      // Else, if there are no more subtags in the language tag's
      // list, the match fails.
      return false
    } else if (range[i] === '*' || range[i] === tag[j]){
      // Else, if the current subtag in the range's list matches the
      // current subtag in the language tag's list, move to the next
      // subtag in both lists and continue with the loop.
      i++
      j++
    } else if (tag[j].length === 1) {
      // Else, if the language tag's subtag is a "singleton" (a single
      // letter or digit, which includes the private-use subtag 'x')
      // the match fails.
      return false
    } else {
      // Else, move to the next subtag in the language tag's list and
      // continue with the loop.
      j++
    }

  }

  return true
}

export default class Spell extends Disposable {
  constructor (dictionaries) {
    super(() => {
      this.process.stdin.end()
    })
    this.emitter = new Emitter()
    this.last = Promise.resolve([])

    Spell.updateLanguages()

    const spellPath = atom.config.get('linter-spell.spellPath')
    this.ispell = path.parse(spellPath).name.toLowerCase()

    let options = ['-a']

    if (dictionaries && dictionaries.length > 0) {
      for (let i = 0; i < dictionaries.length; i++) {
        let tag = tags(dictionaries[i].replace('_', '-'))
        if (tag.valid()) { // This is an IANA tag, we need to turn it into a dictionary
          if (!tag.region()) {
            // Hunspell must have a region, so guess one.
            tag = tags(likelySubtags[tag.language().format()])
          }
          // Ispell does not understand regions
          dictionaries[i] = (this.ispell === 'aspell' || this.ispell === 'hunspell')
            ? `${tag.language().format()}_${tag.region().format()}`
            : tag.language().descriptions()[0].toLowerCase()
        }
      }
      switch (this.ispell) {
        case 'aspell': // Aspell needs extra dictionaries listed separately
          options.push('-d')
          options.push(dictionaries[0])
          if (dictionaries.length > 1) {
            options.push(`--extra-dicts=${dictionaries.slice(1).join()}`)
          }
          break
        case 'hunspell':
          options.push('-d')
          options.push(dictionaries.join())
          break
        default: // Ispell only likes one dictionary
          options.push('-d')
          options.push(dictionaries[0])
          break
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
    languages.clear()
    function add(dictionary) {
      const name = path.basename(dictionary)
      const parts = name.toLowerCase().split(/[-_]/)
      const lang = tags(_.join(_.difference(parts, ['any', 'wo', 'ise', 'lrg', 'med', 'sml', 'ye', 'yo'], tags.filter(parts)), '-'))
      
      if (!languages.has(lang) || name < languages.get(lang)) {
        languages.set(lang, name)
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
            add(line)
          }
        }
        break
    }
    console.log(languages)
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
