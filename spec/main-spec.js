'use babel'

import * as _ from 'lodash'
import * as path from 'path'

describe('The Ispell provider for Atom Linter', () => {
  const lint = require('../lib/providers').provideLinter().lint

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('linter-spell')
    })
  })

  it('finds a spelling in "foo.txt"', () => {
    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, 'files', 'foo.txt')).then(editor => {
        return lint(editor).then(messages => {
          expect(_.some(messages, (message) => { return message.excerpt.match(/^armour( ->|$)/) })).toBe(true)
        })
      })
    })
  })
})
