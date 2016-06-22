'use babel'

import childProcess from 'child_process'
import readline from 'readline'

const texMagicCommentPattern = /^%\s*!TEX\s+spellcheck\s*=\s*(.*)$/gim
const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

export default class Hunspell {
  constructor (grammarScopes) {
    this.checkers = {}
    this.grammarScopes = grammarScopes
  }

  getChecker(dictionary) {
    if (!this.checkers[dictionary]) {
      let options = ['-a']

      if (dictionary) {
        options.push('-d')
        options.push(dictionary)
      }

      switch (this.grammarScopes[0]) {
        case 'text.tex':
          options.push('-t')
          break
        case 'text.html':
          options.push('-H')
          break
        case 'text.nroff':
          options.push('-n')
          break
        case 'text.odf':
          options.push('-O')
          break
        case 'text.xml':
          options.push('-X')
          break
      }

      let process = childProcess.spawn('hunspell', options)

      process.on('exit', (code) => {
        console.log(`Child exited with code ${code}`)
      })

      this.checkers[dictionary] = {
        process: process,
        readline: readline.createInterface({
          input: process.stdout
        })
      }

      process.stdin.write('!\n') // Put into terse mode
    }

    return this.checkers[dictionary]
  }

  async lint (textEditor) {
    let messages = []
    for (let i = 0; i < textEditor.getLineCount(); i++) {
      for (const word of await this.check(textEditor.getBuffer().lineForRow(i))) {
        messages.push({
          type: 'Warning',
          text: `${word.original}: ${word.misses.join(', ')}`,
          range: [[i, word.offset], [i, word.offset + word.original.length]],
          filePath: textEditor.getPath()
        })
      }
    }
    return messages
  }

  check (text) {
    if (text) {
      let foo = this.getChecker(null)
      return new Promise(function (resolve, reject) {
        let words = []
        function onLine (line) {
          console.log(line)
          if (line) {
            const parts = line.split(separatorPattern)
            console.log(parts)
            switch (parts[0]) {
              case '&':
                words.push({
                  original: parts[1],
                  offset: parseInt(parts[3], 10),
                  misses: parts.slice(4)
                })
                break
              case '#':
                words.push({
                  original: parts[1],
                  offset: parseInt(parts[2], 10),
                  misses: []
                })
            }
          } else {
            foo.readline.removeListener('line', onLine)
            resolve(words)
          }
        }
        foo.readline.on('line', onLine)
        foo.process.stdin.write(text.replace("''", '""' /* hack */).replace(commandPattern, '^$&') + '\n')
      })
    } else {
      return []
    }
  }

}
