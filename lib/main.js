'use babel'

import { Disposable, CompositeDisposable } from 'atom'

const Main = {
  disposables: null,
  languageListView: null,

  createLanguageListView  () {
     if (!this.languageListView) {
       let LanguageListView = require('./language-list-view')
       this.languageListView = new LanguageListView()
     }
     this.languageListView.toggle()
  },

  activate () {
    this.disposables = new CompositeDisposable()

    let LanguageManager = require('./language-manager')
    global.languageManager = new LanguageManager()
    this.disposables.add(global.languageManager)

    let GrammarManager = require('./grammar-manager')
    global.grammarManager = new GrammarManager()
    this.disposables.add(global.grammarManager)

    global.providers = require('./providers')

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
    return global.grammarManager.consumeGrammar(grammars)
  },

  consumeLinter (linter) {
    global.linter = linter
    return new Disposable(() => global.linter = null)
  },

  consumeStatusBar (statusBar) {
    LanguageStatusView = require('./language-status-view')
    let languageStatusView = new LanguageStatusView()
    languageStatusView.initialize(statusBar)
    return new Disposable(() => {
      languageStatusView.destroy()
    })
  },

  provideGrammar () {
    return global.providers.provideGrammar()
  },

  provideIntentions () {
    return global.providers.provideIntentions()
  },

  provideLinter () {
    return global.providers.provideLinter()
  }
}

export default Main
