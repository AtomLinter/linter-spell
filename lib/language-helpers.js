'use babel'

import * as _ from 'lodash'
var tags = require('language-tags')

export function rankRange (range, tag) {
  // From https://tools.ietf.org/html/rfc4647
  range = range.toLowerCase().split(/[-_]/)
  tag = tag.toLowerCase().split(/[-_]/)
  let rank = 1
  // Split both the extended language range and the language tag being
  // compared into a list of subtags by dividing on the hyphen (%x2D)
  // character.  Two subtags match if either they are the same when
  // compared case-insensitively or the language range's subtag is the
  // wildcard '*'.

  // Begin with the first subtag in each list.  If the first subtag in
  // the range does not match the first subtag in the tag, the overall
  // match fails.  Otherwise, move to the next subtag in both the
  // range and the tag.
  if (range[0] !== '*' && range[0] !== tag[0]) {
    return 0
  }

  // While there are more subtags left in the language range's list:
  for (let i = 1, j = 1; i < range.length;) {
    if (range[i] === '*') {
      // If the subtag currently being examined in the range is the
      // wildcard ('*'), move to the next subtag in the range and
      // continue with the loop.
      i++
    } else if (j >= tag.length) {
      // Else, if there are no more subtags in the language tag's
      // list, the match fails.
      return 0
    } else if (range[i] === '*' || range[i] === tag[j]) {
      // Else, if the current subtag in the range's list matches the
      // current subtag in the language tag's list, move to the next
      // subtag in both lists and continue with the loop.
      if (range[i] !== '*') rank += Math.pow(2, i)
      i++
      j++
    } else if (tag[j].length === 1) {
      // Else, if the language tag's subtag is a "singleton" (a single
      // letter or digit, which includes the private-use subtag 'x')
      // the match fails.
      return 0
    } else {
      // Else, move to the next subtag in the language tag's list and
      // continue with the loop.
      j++
    }
  }

  return rank
}

export function rangeMatches (range, tag) {
  return rankRange(range, tag) > 0
}

export function parseRange (name) {
  let parts = name.split(/[-_]/)
  let i = 0
  let lang = []
  for (const type of ['language', 'extlang', 'script', 'region', 'variant']) {
    if (i < parts.length) {
      lang.push((tags.type(parts[i], type) && (type !== 'region' || parts[i].match(/^[A-Z]+$/))) ? parts[i++] : '*')
    }
  }
  return _.dropRightWhile(lang, p => p === '*').join('-') || '*'
}
