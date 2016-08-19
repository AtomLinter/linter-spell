'use babel'

import { Disposable, CompositeDisposable } from 'atom'
var tags = require('language-tags')
import * as _ from 'lodash'

class LanguageStatusView extends HTMLDivElement {
  initialize (statusBar) {
    this.disposables = new CompositeDisposable()
    this.statusBar = statusBar
    this.classList.add('language-status', 'inline-block')
    this.languageLink = document.createElement('a')
    this.languageLink.classList.add('inline-block')
    this.languageLink.href = '#'
    this.disposables.add(atom.tooltips.add(this.languageLink, {title: () => {
      let textEditor = atom.workspace.getActiveTextEditor()
      if (textEditor != null) {
        return _.map(
          global.languageManager.getLanguages(textEditor),
          lang => lang + ' / ' + _.map(tags(lang).subtags(), subtag => subtag.descriptions()[0]).join(', ')).join('\n')
      }
      return ''
    }}))
    this.appendChild(this.languageLink)
    this.handleEvents()
    let tile = this.statusBar.addRightTile({priority: 21, item: this})
    this.disposables.add(new Disposable(() => tile.destroy()))
  }

  handleEvents () {
    this.disposables.add(global.languageManager.onDidChangeLanguages(() => {
      this.updateLanguageText()
    }))

    this.disposables.add(this.activeItemSubscription = atom.workspace.onDidChangeActivePaneItem(() => {
      this.updateLanguageText()
    }))

    let clickHandler = () => {
      atom.commands.dispatch(atom.views.getView(atom.workspace.getActiveTextEditor()), 'linter-spell:show-language-selector')
      return false
    }
    this.addEventListener('click', clickHandler)
    this.disposables.add({dispose: () => this.removeEventListener('click', clickHandler)})

    this.updateLanguageText()
  }

  destroy () {
    this.disposables.dispose()
  }

  updateLanguageText () {
    let textEditor = atom.workspace.getActiveTextEditor()
    let languages
    if (textEditor != null) {
      languages = global.languageManager.getLanguages(textEditor)
      // if (languages) languages = global.languageManager.resolveLanguages(languages)
    }
    if (languages) {
      this.languageLink.textContent = languages.join()
      this.style.display = ''
    } else {
      this.style.display = 'none'
    }
  }
}

export default document.registerElement('language-selector-status', {prototype: LanguageStatusView.prototype})
