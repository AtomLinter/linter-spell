'use babel'

import Hunspell from './hunspell'

export default {

  activate: () => {
    this.hunspell = new Hunspell()
    console.log('My package was activated')
  },

  deactivate: () => {
    console.log('My package was deactivated')
  },

  provideLinter: () => {
    return {
      name: 'hunspell',
      grammarScopes: ['text.tex', 'text.tex.latex'],
      scope: 'file',
      lintOnFly: true,
      lint: (textEditor) => {
        let foo = this.hunspell
        return new Promise(async function (resolve, reject) {
          let messages = []
          for (const line of textEditor.getBuffer().getLines()) {
            console.log(line)
            for (const word of await foo.check(line)) {
              messages.push({
                type: 'Warning',
                text: `${word.original}: ${word.misses.join()}`
              })
            }
          }
          resolve(messages)
        })
      }
    }
  }
}
