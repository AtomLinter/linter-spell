'use babel'

import childProcess from 'child_process'
import readline from 'readline'

const separatorPattern = /(?:\s|[,:])+/
const commandPattern = /^[-*&@+#!%`^~]/
// ~ is in the list even though is harmless. It should be a command, but it is
// treated as regular word as per https://github.com/hunspell/hunspell/issues/100
const modes = {
  'tex': '-t',
  'html': '-H',
  'nroff': '-n',
  'odf': '-O',
  'xml': '-X'
}

export default class Hunspell {
  constructor (mode) {
    this.process = childProcess.spawn('hunspell', ['-a', modes[mode || 'tex']])

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
            bar.removeListener('line', onLine)
            resolve(words)
          }
        }
        bar.on('line', onLine)
        foo.stdin.write(text.replace("''", '""' /* hack */).replace(commandPattern, '^$&') + '\n')
      })
    } else {
      return []
    }
  }

}
