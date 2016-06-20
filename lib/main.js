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
      grammarScopes: ["source.c", "source.cpp", "source.objc", "source.objcpp"],
      scope: "file",
      lintOnFly: trye,
      lint: (activeEditor) => {
        return new Promise(function(resolve, reject) {
           return [{
             type: 'Error',
             text: 'Something went wrong',
             range:[[0,0], [0,1]],
             filePath: textEditor.getPath()
           }]
         })
      }
    }
  }
}
