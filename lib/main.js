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
      lintOnFly: false,
      lint: async (textEditor) => {
        let messages = []
        for (i = 0; i < textEditor.getLineCount(); i++) {
          for (const word of await this.hunspell.check(textEditor.getBuffer().lineForRow(i))) {
            messages.push({
              type: 'Warning',
              text: `${word.original}: ${word.misses.join()}`,
              range: [[i, word.offset], [i, word.offset + word.original.length]],
              filePath: textEditor.getPath()
            })
          }
        }
        console.log(messages)
        return messages
      }
    }
  }
}
