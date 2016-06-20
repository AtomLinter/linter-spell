"use babel";

export default {

  activate: () => {
    console.log('My package was activated')
  },

  deactivate: () => {
    console.log('My package was deactivated')
  },

  provideLinter: () => {
    return {
      name: "hunspell",
      grammarScopes: ["text.tex", "text.tex.latex"],
      scope: "file",
      lintOnFly: true,
      lint: (textEditor) => {
        return new Promise(function(resolve, reject) {
           resolve([{
             type: 'Error',
             text: 'Something went wrong',
             range:[[0,0], [0,1]],
             filePath: textEditor.getPath()
           }])
         })
      }
    }
  }
}
