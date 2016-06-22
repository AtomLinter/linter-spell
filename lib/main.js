'use babel'

import Hunspell from './hunspell'

const texMagicCommentPattern = /^%\s*!TEX\s+spellcheck\s*=\s*(.*)$/i

class Main {

  constructor () {
    this.checkers = {}
  }

  activate () {
    console.log('My package was activated')
  }

  deactivate () {
    console.log('My package was deactivated')
  }

  getChecker (grammarScope, dictionary) {
    if (!this.checkers[dictionary]) {
      this.checkers[dictionary] = new Hunspell([grammarScope], dictionary)
    }

    return this.checkers[dictionary]
  }

  async lint (textEditor) {
    let messages = []
    let checker = this.getChecker('text.tex', null)
    for (let i = 0; i < textEditor.getLineCount(); i++) {
      for (const word of await checker.check(textEditor.getBuffer().lineForRow(i))) {
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

  provideLinter () {
    let foo = this
    return {
      name: 'hunspell',
      grammarScopes: ['text.tex', 'text.tex.latex'],
      scope: 'file',
      lintOnFly: false,
      lint: (textEditor) => { return foo.lint(textEditor) }
    }
  }
}

export default new Main()
