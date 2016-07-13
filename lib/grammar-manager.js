'use babel'

import * as _ from 'lodash'
import { Disposable, CompositeDisposable } from 'atom'

export default class GrammarManager extends Disposable {
  constructor () {
    super(() => {
      this.disposables.dispose()
      this.grammars = new Set()
      this.checkedScopes = new Map()
    })
    this.grammars = new Set()
    this.checkedScopes = new Map()
  }

  getGrammar (textEditor) {
    const scope = textEditor.getGrammar().scopeName
    for (const grammar of this.grammars.values()) {
      if (_.includes(grammar.grammarScopes, scope)) {
        return grammar
      }
    }
  }

  updateLanguage (textEditor) {
    const grammar = this.getGrammar(textEditor)
    if (grammar && grammar.findLanguageTags) {
      const l = grammar.findLanguageTags(textEditor)
      global.languageManager.setLanguages(textEditor, (l && l.length > 0) ? l : null, 'auto')
    }
  }

  isIgnored (scopeDescriptor) {
    let path = scopeDescriptor.getScopesArray()
    let i = path.length
    while (i--) {
      if (this.checkedScopes.has(path[i])) {
        return this.checkedScopes.get(path[i]) < 0
      }
    }
    return true
  }

  scopeVote (scope, vote) {
    vote += this.checkedScopes.get(scope) || 0
    if (vote === 0) {
      this.checkedScopes.delete(scope)
    } else {
      this.checkedScopes.set(scope, vote)
    }
  }

  grammarScopeVotes (grammar, falseVote, trueVote) {
    if (grammar.checkedScopes) {
      _.forEach(grammar.checkedScopes, (value, key) => this.scopeVote(key, value ? trueVote : falseVote))
    } else {
      _.forEach(grammar.grammarScopes, key => this.scopeVote(key, trueVote))
    }
  }

  consumeGrammar (grammars) {
    grammars = _.castArray(grammars)
    for (const grammar of grammars) {
      this.grammars.add(grammar)
      this.grammarScopeVotes(grammar, -1, 1)
    }
    return new Disposable(() => {
      for (const grammar of grammars) {
        this.grammars.delete(grammar)
        this.grammarScopeVotes(grammar, 1, -1)
      }
    })
  }
}
