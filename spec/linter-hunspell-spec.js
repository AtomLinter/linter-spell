'use babel'

import * as _ from 'lodash'
import * as path from 'path'

describe('The hunspell provider for Atom Linter', () => {
  const lint = require('../lib/main').provideLinter().lint

  beforeEach(() => {
    waitsForPromise(() => {
      atom.packages.activatePackage('language-latex')
      return atom.packages.activatePackage('linter-hunspell')
    })
  })

  it('finds a spelling in "foo.tex"', () => {
    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, 'files', 'foo.tex')).then(editor => {
        return lint(editor, 'text.tex.latex').then(messages => {
          expect(_.some(messages, (message) => { return message.text.match(/^armour(:|$)/) })).toBe(true)
          // expect(_.some(messages, (message) => { return message.text.match(/^travelling(:|$)/) })).toBe(true)
        })
      })
    })
  })
})
