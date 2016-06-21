'use babel'

import childProcess from 'child_process'
import readline from 'readline'

const separatorPattern = /(\s|[,:])/

export default class Hunspell {
  constructor () {
    this.process = childProcess.spawn('/usr/bin/hunspell', ['-a'])

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`)
    })

    this.process.stdin.write('!') // Put into terse mode

    this.readline = readline.createInterface({
      input: this.process.stdout
    })
  }

  check (text) {
    let foo = this.process
    let bar = this.readline
    return new Promise(function (resolve, reject) {
      let words = []
      function onLine (line) {
        if (line) {
          const parts = line.split(separatorPattern)
          switch (parts[1]) {
            case '&':
              words.push({
                original: parts[2],
                offset: parts[4],
                misses: parts.slice(5)
              })
              break
            case '#':
              words.push({
                original: parts[2],
                offset: parts[3],
                misses: []
              })
          }
        } else {
          bar.removeListener('line', onLine)
          resolve(words)
        }
      }
      bar.on('line', onLine)
      foo.stdin.write(text)
    })
  }

}
