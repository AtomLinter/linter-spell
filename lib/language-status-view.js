'use babel'

// View to show the language name in the status bar.
class LanguageStatusView extends HTMLDivElement {
  initialize (statusBar, languages) {
    this.statusBar = statusBar
    this.languages = languages
    this.classList.add('language-status', 'inline-block')
    this.languageLink = document.createElement('a')
    this.languageLink.classList.add('inline-block')
    this.languageLink.href = '#'
    this.appendChild(this.languageLink)
    this.handleEvents()
  }

  attach () {
    this.tile = this.statusBar.addRightTile({priority: 21, item: this})
  }

  handleEvents () {
    this.languageSubscription = global.languageManager.onDidChangeLanguages(() => {
      this.updateLanguageText()
    })
    this.activeItemSubscription = atom.workspace.onDidChangeActivePaneItem(() => {
      this.updateLanguageText()
    })

    let clickHandler = () => {
      atom.commands.dispatch(atom.views.getView(this.getActiveTextEditor()), 'language-selector:show')
      return false
    }
    this.addEventListener('click', clickHandler)
    this.clickSubscription = {dispose: () => this.removeEventListener('click', clickHandler)}

    this.updateLanguageText()
    // this.subscribeToActiveTextEditor()
  }

  destroy () {
    if (this.activeItemSubscription != null) {
      this.activeItemSubscription.dispose()
    }
    if (this.languageSubscription != null) {
      this.languageSubscription.dispose()
    }
    if (this.clickSubscription != null) {
      this.clickSubscription.dispose()
    }
    if (this.tile != null) {
      this.tile.destroy()
    }
  }

  getActiveTextEditor () {
    return atom.workspace.getActiveTextEditor()
  }

  // subscribeToActiveTextEditor () {
  //   if (this.languageSubscription != null) {
  //     this.languageSubscription.dispose()
  //   }
  //   if (this.getActiveTextEditor() != null) {
  //     this.languageSubscription = this.getActiveTextEditor().onDidChangeEncoding(() => {})
  //     this.updateLanguageText()
  //   }
  //   this.updateLanguageText()
  // }

  updateLanguageText () {
    if (this.getActiveTextEditor() != null) {
      var language = global.languageManager.getLanguages(this.getActiveTextEditor())
    }
    if (language != null) {
      this.languageLink.textContent = language.join()
      // language = language.toLowerCase().replace(/[^0-9a-z]|:\d{4}$/g, '')
      // if (this.languages[language] != null) {
      //   this.languageLink.textContent = this.languages[language].status != null ? this.languages[language].status : language
      // }
      // this.languageLink.dataset.language = language
      this.style.display = ''
    } else {
      this.style.display = 'none'
    }
  }
}

export default document.registerElement('language-selector-status', {prototype: LanguageStatusView.prototype})
