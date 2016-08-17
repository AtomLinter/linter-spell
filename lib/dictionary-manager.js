'use babel'

import * as _ from 'lodash'
import { Disposable, CompositeDisposable } from 'atom'

export default class DictionaryManager extends Disposable {
  constructor () {
    super(() => {
      this.disposables.dispose()
      this.dictionaries = new Set()
    })
    this.disposables = new CompositeDisposable()
    this.dictionaries = new Set()
  }

  checkWord (textEditor, languages, range) {
    const word = textEditor.getTextInBufferRange(range)
    const scopes = textEditor.scopeDescriptorForBufferPosition(range.start).getScopesArray()
    const dictionaries = _.filter(this.dictionaries,
      dictionary => ((!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (!dictionary.languages || dictionary.languages.includes('*') || _.some(dictionary.languages, language => languages.includes(language)))))
    for (const dictionary of dictionaries) {
      if (dictionary.checkWord(word)) {
        return { isWord: true, dictionaries: dictionaries }
      }
    }
    return { isWord: false, dictionaries: dictionaries }
  }

  consumeDictionary (dictionaries) {
    dictionaries = _.castArray(dictionaries)
    for (const dictionary of dictionaries) {
      this.dictionaries.add(dictionary)
    }
    return new Disposable(() => {
      for (const dictionary of dictionaries) {
        this.dictionaries.delete(dictionary)
      }
    })
  }
}
