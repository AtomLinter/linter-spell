'use babel'

import Hunspell from './hunspell'

const dictionaryPattern = {
  tex: /^%\s*!TEX\s+spellcheck\s*=\s*(.*)$/im
}
const dictionarySeparatorPattern = /(?:\s,)+/

class Main {

  constructor () {
    this.locale = 'en_US'
    require('os-locale')((err, locale) => {
      if (!err) {
        this.locale = locale || this.locale
      }
    })
    this.checkers = {}
    this.grammars = {}
  }

  activate () {
    atom.config.onDidChange('linter-hunspell', this.updateGrammars)
    this.updateGrammars()
  }

  deactivate () {
  }

  getChecker (name, dictionary) {
    let id = `${name}|${dictionary}`
    console.log(`getChecker ${id}`)
    if (!this.checkers[id]) {
      this.checkers[id] = new Hunspell(name, dictionary)
    }

    return this.checkers[id]
  }

  updateGrammars () {
    this.grammars = {}
    for (const name of ['tex', 'html', 'xml', 'plain']) {
      const enable = atom.config.get(`linter-hunspell.${name}Enable`) !== false
      if (enable) {
        const grammars = atom.config.get(`linter-hunspell.${name}GrammarScopes`)
        for (const grammar of grammars) {
          this.grammars[grammar] = name
        }
      }
    }
  }

  async lint (textEditor, scopeName) {
    let messages = []
    if (!scopeName) {
      scopeName = textEditor.getGrammar().scopeName
    }
    const name = this.grammars[scopeName]
    if (name) {
      let dictionaries = atom.config.get('linter-hunspell.defaultDictionaries')
      dictionaries = (dictionaries.length === 0) ? this.locale : dictionaries.join(',')
      if (name in dictionaryPattern) {
        const match = textEditor.getBuffer().getText().match(dictionaryPattern[name])
        if (match) {
          dictionaries = match[1].replace(dictionarySeparatorPattern, ',')
        }
      }
      let checker = this.getChecker(name, dictionaries)
      for (let i = 0; i < textEditor.getLineCount(); i++) {
        for (const word of await checker.checkLine(textEditor.getBuffer().lineForRow(i))) {
          messages.push({
            type: 'Warning',
            text: `${word.original}: ${word.misses.join(', ')}`,
            range: [[i, word.offset], [i, word.offset + word.original.length]],
            filePath: textEditor.getPath()
          })
        }
      }
    }
    return messages
  }

  provideLinter () {
    let foo = this
    return {
      name: 'hunspell',
      grammarScopes: ['*'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor, scopeName) => { return foo.lint(textEditor, scopeName) }
    }
  }
}

export default new Main()
