'use babel'

import { SelectListView } from 'atom-space-pen-views'
var tags = require('language-tags')
import * as _ from 'lodash'

// View to display a list of languages to use in the current editor.
export default class LanguageListView extends SelectListView {
  initialize () {
    super.initialize()

    this.panel = atom.workspace.addModalPanel({item: this, visible: false})
    this.addClass('language-selector')
    return this.list.addClass('mark-active')
  }

  getFilterKey () {
    return 'value'
  }

  viewForItem (language) {
    let element = document.createElement('li')
    if (language.id === this.currentLanguage || (!language.id && !this.currentLanguage)) { element.classList.add('active') }
    element.textContent = language.value
    element.dataset.language = language.id
    return element
  }

  toggle () {
    if (this.panel.isVisible()) {
      return this.cancel()
    } else if (this.editor = atom.workspace.getActiveTextEditor()) {
      return this.attach()
    }
  }

  destroy () {
    return this.panel.destroy()
  }

  cancelled () {
    return this.panel.hide()
  }

  confirmed (language) {
    this.cancel()
    global.languageManager.setLanguages(this.editor, language.id ? [language.id] : null, 'manual')
  }

  addLanguages () {
    this.currentLanguage = global.languageManager.getLanguages(this.editor, 'manual')
    if (this.currentLanguage) this.currentLanguage = this.currentLanguage[0]
    this.setItems(
      _.concat(
        [{ id: null, value: 'Auto-Select' }],
        _.map(
          global.languageManager.getAvailableLanguages(),
          lang => ({ id: lang, value: lang + ' / ' + _.map(tags(lang).subtags(), subtag => subtag.descriptions()[0]).join(', ') }))))
  }

  attach () {
    this.storeFocusedElement()
    this.addLanguages()
    this.panel.show()
    this.focusFilterEditor()
  }
};
