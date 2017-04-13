'use babel'

import { beforeEach, it } from 'jasmine-fix'
import * as path from 'path'

describe('The Ispell provider for Atom Linter', () => {
  let lint

  beforeEach(async () => {
    await atom.packages.activatePackage('linter-spell')
    const main = require('../lib/main.js')
    const linterProvider = main.provideLinter()
    lint = linterProvider.lint
  })

  it('finds a spelling in "foo.txt"', async () => {
    const editor = await atom.workspace.open(path.join(__dirname, 'files', 'foo.txt'))
    const messages = await lint(editor)
    expect(messages.some((message) => { return message.excerpt.match(/^armour( ->|$)/) })).toBe(true)
  })
})
