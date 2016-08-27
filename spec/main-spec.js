'use babel'

import * as _ from 'lodash'
import * as path from 'path'

describe('The Ispell provider for Atom Linter', () => {
  atom.config.set('linter-spell.spellPath', 'hunspell')
  atom.config.set('linter-spell.defaultLanguages', [])
  const main = require('../lib/main')
  // main.activate()
  // main.consumeDictionary(main.provideDictionary())
  const lint = require('../lib/providers').provideLinter().lint

beforeEach(() => {
  waitsForPromise(() => {
    return Promise.all(['linter-spell', 'intentions', 'linter'].map(p => atom.packages.activatePackage(p)))
  })
})

  it('finds a spelling in "foo.txt"', () => {
    waitsForPromise(() => {
      return atom.workspace.open(path.join(__dirname, 'files', 'foo.txt')).then(editor => {
        return lint(editor).then(messages => {
          expect(_.some(messages, (message) => { return message.text.match(/^armour( ->|$)/) })).toBe(true)
          // expect(_.some(messages, (message) => { return message.text.match(/^travelling(:|$)/) })).toBe(true)
        })
      })
    })
  })
})
