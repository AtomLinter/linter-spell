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

  checkRange (textEditor, languages, range) {
    console.log(this.dictionaries)
    const scopes = textEditor.scopeDescriptorForBufferPosition(range.start).getScopesArray()
    // Find the first dictionary that has the correct grammar scopes and understands how to do work breaks on the primary language
    const primary = _.find(this.dictionaries,
      dictionary => (dictionary.checkRange &&
        (!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (dictionary.languages && _.some(_.map(dictionary.languages, helpers.parseRange), range => helpers.rangeMatches(range, languages[0])))))
    // if we cannot find a primary dictionary then give up
    console.log(primary)
    if (!primary) return new Promise(resolve => resolve([]))

    // Find all other dictionaries excluding the primary
    const dictionaries = _.without(_.filter(this.dictionaries,
      dictionary => ((!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (!dictionary.languages || dictionary.languages.includes('*') || _.some(_.map(dictionary.languages, helpers.parseRange), range => _.some(languages, tag => helpers.rangeMatches(range, tag)))))),
      primary)

    console.log(primary)
    console.log(dictionaries)

    primary.checkRange(textEditor, languages, range)
      .then(misspellings => {
        return Promise.all(_.map(misspellings,
          misspelling =>
            Promise
              .all(_.map(dictionaries, dictionary => dictionary.checkWord(textEditor, languages, misspelling.range)))
              .then(responses => {
                let result = {
                  range: misspelling.range,
                  suggestions: misspelling.suggestions || [],
                  actions: misspelling.actions || []
                }
                for (const resp of responses) {
                  if (resp.isWord) return { }
                  if (resp.suggestions) result.suggestions = _.union(result.suggestions, resp.suggestions)
                  if (resp.actions) result.actions = _.concat(result.actions, resp.actions)
                }
              })),
          results => _.filter(results, 'range'))
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
