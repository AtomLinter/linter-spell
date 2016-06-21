'use babel'

import childProcess from 'child_process'
import readline from 'readline'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+~#!%`]/

export default class Hunspell {
  constructor () {
    this.process = childProcess.spawn('/usr/bin/hunspell', ['-a', '-t'])

    this.process.on('exit', (code) => {
      console.log(`Child exited with code ${code}`)
    })

    this.process.stdin.write('!\n') // Put into terse mode

    this.readline = readline.createInterface({
      input: this.process.stdout
    })
  }

  check (text) {
    if (text) {
      let foo = this.process
      let bar = this.readline
      return new Promise(function (resolve, reject) {
        let words = []
        function onLine (line) {
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
            bar.removeListener('line', onLine)
            resolve(words)
          }
        }
        bar.on('line', onLine)
        foo.stdin.write(text.replace(commandPattern, '^$&') + '\n')
      })
    } else {
      return []
    }
  }

}
