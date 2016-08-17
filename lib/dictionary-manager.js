'use babel'

import * as _ from 'lodash'
import { Disposable, CompositeDisposable } from 'atom'

export default class DictionaryManager extends Disposable {
  constructor () {
    super(() => {
      this.disposables.dispose()
      this.dictionaries = new Set()
      // this.grammarMap = new Map()
      // this.checkedScopes = new Map()
    })
    this.disposables = new CompositeDisposable()
    this.dictionaries = new Set()
    // this.grammarMap = new Map()
    // this.checkedScopes = new Map()
  }

  getDictionaries (scopeName, language) {
    return _.filter(this.dictionaries,
      dictionary => (!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || dictionary.grammarScopes.includes(scopeName)) &&
        (!dictionary.languages || dictionary.languages.includes('*') || dictionary.languages.includes(language)))
  }

  // getGrammar (textEditor) {
  //   return this.grammarMap.get(textEditor.getGrammar().scopeName)
  // }
  //
  // getEmbeddedGrammar (scopeDescriptor) {
  //   let path = scopeDescriptor.getScopesArray().slice(1)
  //   let i = path.length
  //   while (i--) {
  //     const grammar = this.grammarMap.get(path[i])
  //     if (grammar) return grammar
  //   }
  // }
  //
  // updateLanguage (textEditor) {
  //   const grammar = this.getGrammar(textEditor)
  //   if (grammar && grammar.findLanguageTags) {
  //     const l = grammar.findLanguageTags(textEditor)
  //     global.languageManager.setLanguages(textEditor, (l && l.length > 0) ? l : null, 'auto')
  //   }
  // }
  //
  // isIgnored (scopeDescriptor) {
  //   let path = scopeDescriptor.getScopesArray()
  //   let i = path.length
  //   while (i--) {
  //     if (this.checkedScopes.has(path[i])) {
  //       const v = this.checkedScopes.get(path[i])
  //       return !(_.isFunction(v) ? v() : v)
  //     }
  //   }
  //   return true
  // }

  consumeDictionary (dictionaries) {
    dictionaries = _.castArray(dictionaries)
    for (const dictionary of dictionaries) {
      this.dictionaries.add(dictionary)
      // for (const scope of grammar.grammarScopes) {
      //   this.grammarMap.set(scope, grammar)
      // }
    }
    return new Disposable(() => {
      for (const dictionary of dictionaries) {
        this.dictionaries.delete(dictionary)
        // for (const scope of grammar.grammarScopes) {
        //   this.grammarMap.delete(scope)
        // }
      }
    })
  }
}
