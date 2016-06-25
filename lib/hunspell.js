'use babel'

import childProcess from 'child_process'
import readline from 'readline'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100

export default class Hunspell {
  constructor (name, dictionary) {
    this.last = Promise.resolve([])

    let options = ['-a']

    switch (name) {
      case 'tex':
        options.push('-t')
        break
      case 'html':
        options.push('-H')
        break
      case 'nroff':
        options.push('-n')
        break
      case 'odf':
        options.push('-O')
        break
      case 'xml':
        options.push('-X')
        break
    }

    if (dictionary) {
      options.push('-d')
      options.push(dictionary)
    }

    this.process = childProcess.spawn(atom.config.get('linter-hunspell.hunspellPath'), options)

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`)
    })

    this.readline = readline.createInterface({
      input: this.process.stdout
    })

    this.process.stdin.write('!\n') // Put into terse mode
  }

  addWord (word) {
    this.process.write(`*${word}\n`)
  }

  addWordIgnoreCase (word) {
    this.process.write(`&${word}\n`)
  }

  ignoreWord (word) {
    this.process.write(`@${word}\n`)
  }

  checkLine (text) {
    let foo = this.process
    let bar = this.readline
    function ex (resolve, reject) {
      let words = []
      function onLine (line) {
        if (line) {
          const parts = line.split(separatorPattern)
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
