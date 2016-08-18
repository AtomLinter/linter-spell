'use babel'

import * as _ from 'lodash'
import * as helpers from './language-helpers'
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
    const scopes = textEditor.scopeDescriptorForBufferPosition(range.start).getScopesArray()
    const dictionaries = _.filter(this.dictionaries,
      dictionary => ((!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (!dictionary.languages || dictionary.languages.includes('*') || _.some(_.map(dictionary.languages, helpers.parseRange), range => _.some(languages, tag => helpers.rangeMatches(range, tag))))))

    return Promise
      .all(_.map(dictionaries, dictionary => dictionary.checkWord(textEditor, languages, range)))
      .then(responses => {
        let result = {
          isWord: false,
          suggestions: [],
          actions: []
        }
        for (const resp of responses) {
          if (resp.isWord) return { isWord: true }
          if (resp.suggestions) result.suggestions = _.union(result.suggestions, resp.suggestions)
          if (resp.actions) result.actions = _.concat(result.actions, resp.actions)
        }
      })
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

  getAvailableLanguages () {
    let languages = []
    for (const dictionary of this.dictionaries) {
      if (dictionary.languages) languages = _.union(languages, dictionary.languages)
    }
    return _.sort(languages)
  }
}
