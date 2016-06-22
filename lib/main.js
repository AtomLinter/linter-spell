'use babel'

import Hunspell from './hunspell'

export default {

  activate: () => {
    console.log('My package was activated')
  },

  deactivate: () => {
    console.log('My package was deactivated')
  },

  provideLinter: () => {
    function createLinter (grammarScopes) {
      let hunspell = new Hunspell(grammarScopes)
      return {
        name: 'hunspell',
        grammarScopes: ['text.tex', 'text.tex.latex'],
        scope: 'file',
        lintOnFly: false,
        lint: async (textEditor) => { return hunspell.lint(textEditor) }
      }
    }

    return createLinter(['text.tex', 'text.tex.latex'])
  }
}
