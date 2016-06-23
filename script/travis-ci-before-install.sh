#!/bin/sh

if [[ "$TRAVIS_OS_NAME" == "osx" ]]; then
  brew update;
  brew install hunspell;
  wget http://downloads.sourceforge.net/project/wordlist/speller/2016.01.19/hunspell-en_US-2016.01.19.zip
  unzip hunspell-en_US-2016.01.19.zip
  mkdir ~/Library/Spelling
  mv en_US.aff ~/Library/Spelling
  mv en_US.dic ~/Library/Spelling
fi
