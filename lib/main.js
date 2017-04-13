'use babel'

import * as _ from 'lodash'
import { Disposable, CompositeDisposable } from 'atom'

const Main = {
  disposables: null,
  languageListView: null,

  createLanguageListView  () {
    if (!this.languageListView) {
      let LanguageListView = require('./language-list-view')
      this.languageListView = new LanguageListView()
      this.languageListView.initialize(this.languageManager, this.dictionaryManager)
    }
    this.languageListView.toggle()
  },

  activate () {
    this.disposables = new CompositeDisposable()

    function warn () {
      atom.notifications.addWarning('spell-check package is enabled',
      { detail: 'spell-check and linter-spell will spell check the same\ndocuments and spell-check will interfere with linter-spell.\nPlease disable the spell-check package. If you do not want\nto see this warning you can disable it in the settings\nfor linter-spell.' })
    }

    if (atom.config.get('linter-spell.checkForSpellCheck') && atom.packages.isPackageActive('spell-check')) warn()

    atom.packages.onDidActivatePackage(p => { if (atom.config.get('linter-spell.checkForSpellCheck') && p.name === 'spell-check') warn() })

    let DictionaryProvider = require('./dictionary-provider')
    this.dictionaryProvider = new DictionaryProvider()
    this.disposables.add(this.dictionaryProvider)


    let GrammarManager = require('./grammar-manager')
    this.grammarManager = new GrammarManager()
    this.disposables.add(this.grammarManager)

    let LanguageManager = require('./language-manager')
    this.languageManager = new LanguageManager(this.grammarManager)
    this.disposables.add(this.languageManager)

    let DictionaryManager = require('./dictionary-manager')
    this.dictionaryManager = new DictionaryManager()
    this.disposables.add(this.dictionaryManager)

    const Providers = require('./providers')
    this.providers = new Providers({
      grammarManager: this.grammarManager,
      languageManager: this.languageManager,
      dictionaryManager: this.dictionaryManager
    })

    this.disposables.add(
      atom.commands.add('atom-text-editor',
        'linter-spell:show-language-selector',
        this.createLanguageListView))

    require('atom-package-deps').install('linter-spell')
      .then(() => {
        console.log('All dependencies installed, good to go')
      })
  },

  deactivate () {
    this.disposables.dispose()
  },

  consumeGrammar (grammars) {
    return this.grammarManager.consumeGrammar(grammars, this.languageManager)
  },

  consumeDictionary (dictionaries) {
    return this.dictionaryManager.consumeDictionary(dictionaries)
  },

  consumeLinter (linter) {
    this.linter = linter
    return new Disposable(() => { this.linter = null })
  },

  consumeStatusBar (statusBar) {
    const LanguageStatusView = require('./language-status-view')
    let languageStatusView = new LanguageStatusView()
    languageStatusView.initialize(statusBar, this.languageManager)
    return new Disposable(() => {
      languageStatusView.destroy()
    })
  },

  provideGrammar () {
    return this.providers.provideGrammar()
  },

  provideDictionary () {
    let wordList = require('linter-spell-word-list')

    let wordLists = [{
      name: 'plain text',
      keyPath: 'linter-spell.plainTextWords',
      grammarScopes: [
        'text.plain',
        'text.plain.null-grammar'
      ]
    }, {
      name: 'GIT commit',
      keyPath: 'linter-spell.gitCommitWords',
      grammarScopes: [
        'text.git-commit'
      ]
    }, {
      name: 'AsciiDoc',
      keyPath: 'linter-spell.asciiDocWords',
      grammarScopes: [
        'source.asciidoc'
      ]
    }, {
      name: 'Markdown',
      keyPath: 'linter-spell.markdownWords',
      grammarScopes: [
        'source.gfm',
        'text.md'
      ]
    }]

    return _.concat(
      [this.dictionaryProvider.provideDictionary()],
      _.map(wordLists, opt => {
        let a = new wordList.ConfigWordList(opt)
        this.disposables.add(a)
        return a.provideDictionary()
      }))
  },

  provideLinter () {
    return this.providers.provideLinter()
  }

}

export default Main
