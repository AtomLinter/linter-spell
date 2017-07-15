'use babel'

import * as _ from 'lodash'
import * as helpers from './language-helpers'
import jaroWinkler from 'jaro-winkler'
import { Disposable, CompositeDisposable } from 'atom'

export default class DictionaryManager extends Disposable {
  constructor () {
    super(() => {
      this.disposables.dispose()
      this.primaries = new Set()
      this.secondaries = new Set()
    })
    this.disposables = new CompositeDisposable()
    this.primaries = new Set()
    this.secondaries = new Set()
  }

  checkRange (textEditor, languages, range) {
    const scopes = textEditor.scopeDescriptorForBufferPosition(range.start).getScopesArray()
    // Find the first dictionary that has the correct grammar scopes and understands how to do work breaks oesn the primary language
    let primary
    for (const dictionary of this.primaries) {
      if ((!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (dictionary.languages && _.some(_.map(dictionary.languages, helpers.parseRange), range => helpers.rangeMatches(range, languages[0])))) {
        primary = dictionary
        break
      }
    }
    // if we cannot find a primary dictionary then give up
    if (!primary) return new Promise(resolve => resolve([]))

    let secondaries = []
    // Find all other dictionaries excluding the primary
    for (const dictionary of this.secondaries) {
      if (dictionary !== primary &&
        (!dictionary.grammarScopes || dictionary.grammarScopes.includes('*') || _.some(dictionary.grammarScopes, scope => scopes.includes(scope))) &&
        (!dictionary.languages || dictionary.languages.includes('*') || _.some(_.map(dictionary.languages, helpers.parseRange), range => _.some(languages, tag => helpers.rangeMatches(range, tag))))) {
        secondaries.push(dictionary)
      }
    }

    let checkMisspelling = misspelling => {
      return Promise
        .all(_.map(secondaries, dictionary => dictionary.checkWord(textEditor, languages, misspelling.range)))
        .then(responses => {
          const text = textEditor.getTextInBufferRange(misspelling.range)
          let result = {
            range: misspelling.range,
            suggestions: misspelling.suggestions || [],
            actions: misspelling.actions || []
          }
          for (const resp of responses) {
            if (resp.isWord) return undefined
            if (resp.suggestions) result.suggestions = _.union(result.suggestions, resp.suggestions)
            if (resp.actions) result.actions = _.concat(result.actions, resp.actions)
          }
          result.suggestions = _.sortBy(result.suggestions, suggestion => 1 - jaroWinkler(text, suggestion))
          return result
        })
    }

    return primary.checkRange(textEditor, languages, range)
      .then(misspellings => {
        return Promise.all(_.map(misspellings, checkMisspelling)).then(
          results => _.filter(results))
      })
  }

  consumeDictionary (dictionaries) {
    dictionaries = _.castArray(dictionaries)
    for (const dictionary of dictionaries) {
      if (dictionary.checkRange) this.primaries.add(dictionary)
      this.secondaries.add(dictionary)
    }
    return new Disposable(() => {
      for (const dictionary of dictionaries) {
        if (dictionary.checkRange) this.primaries.delete(dictionary)
        this.secondaries.delete(dictionary)
      }
    })
  }

  getAvailableLanguages () {
    let languages = []
    for (const dictionary of this.secondaries) {
      if (dictionary.languages) languages = _.union(languages, dictionary.languages)
    }
    return _.sortBy(languages)
  }
}
