'use babel'

var tags = require('language-tags')
import { Disposable, Emitter, CompositeDisposable } from 'atom'
import osLocale from 'os-locale'

export default class LanguageManager extends Disposable {

  constructor (grammarManager) {
    super(() => {
      this.disposables.dispose()
    })
    this.grammarManager = grammarManager
    this.disposables = new CompositeDisposable()
    const locale = osLocale.sync()
    this.systemLanguages = [tags(locale.replace(/_/g, '-')).format()]
    this.emitter = new Emitter()
    this.disposables.add(this.emitter)
    this.languages = new Map()
    atom.config.onDidChange('linter-spell.defaultLanguages', () => {
      this.updateConfigLanguages()
    })
    this.updateConfigLanguages()
  }

  updateConfigLanguages () {
    this.configLanguages = atom.config.get('linter-spell.defaultLanguages')
    if (this.configLanguages.length === 0) {
      this.configLanguages = null
    }
  }

  onDidChangeLanguages (callback) {
    return this.emitter.on('change-languages', callback)
  }

  getLanguages (textEditor, type) {
    let l = this.languages.get(textEditor)
    if (!l) {
      this.grammarManager.updateLanguage(textEditor, this)
      l = this.languages.get(textEditor)
      if (!l) {
        if (this.grammarManager.getGrammar(textEditor)) {
          this.languages.set(textEditor, l = {})
        } else {
          return
        }
      }
    }
    return type ? l[type] : (l.manual || l.auto || this.configLanguages || this.systemLanguages)
  }

  setLanguages (textEditor, languages, type) {
    let l = this.languages.get(textEditor) || {}
    l[type] = languages
    this.languages.set(textEditor, l)
    this.emitter.emit('change-languages', null)
  }

}
