'use babel'

import Hunspell from './hunspell'

class Main {

  constructor() {
  }

  activate () {
    console.log('My package was activated')
  }

  deactivate () {
    console.log('My package was deactivated')
  }

  createLinter (grammarScopes) {
    let hunspell = new Hunspell(grammarScopes)
    return {
      name: 'hunspell',
      grammarScopes: ['text.tex', 'text.tex.latex'],
      scope: 'file',
      lintOnFly: false,
      lint: async (textEditor) => { return hunspell.lint(textEditor) }
    }
  }

  provideLinter () {
    return this.createLinter(['text.tex', 'text.tex.latex'])
  }
}

export default new Main()
