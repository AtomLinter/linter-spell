'use babel'

import * as _ from 'lodash'
import * as path from 'path'

describe('The hunspell provider for Atom Linter', () => {
  const lint = require('../lib/main').provideLinter().lint

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('linter-spell')
    })
  })

  it('finds a spelling in "foo.txt"', () => {
    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, 'files', 'foo.txt')).then(editor => {
        return lint(editor, 'text.plain').then(messages => {
          expect(_.some(messages, (message) => { return message.text.match(/^armour(:|$)/) })).toBe(true)
          // expect(_.some(messages, (message) => { return message.text.match(/^travelling(:|$)/) })).toBe(true)
        })
      })
    })
  })
})
