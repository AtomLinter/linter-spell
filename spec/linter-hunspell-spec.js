'use babel'

import * as path from 'path'

describe('The hunspell provider for Atom Linter', () => {
  const lint = require('../lib/main').provideLinter().lint

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('linter-hunspell')
    })
  })

  it('finds a spelling in "foo.tex"', () => {
    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, 'files', 'foo.tex')).then(editor => {
        return lint(editor).then(messages => {
          console.log(messages)
          expect(messages.length).toEqual(1)
          expect(messages[0].type).toEqual('Warning')
          expect(messages[0].text).toEqual('ghj')
        })
      })
    })
  })
})
