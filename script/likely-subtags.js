var http = require('http')
var parseString = require('xml2js').parseString
var jsonfile = require('jsonfile')
var _ = require('lodash')

http.get(
  'http://unicode.org/repos/cldr/trunk/common/supplemental/likelySubtags.xml',
  res => {
    var xml = ''
    res.on('data', (chunk) => {
      xml += chunk
    })
    res.on('end', () => {
      parseString(xml, function (err, result) {
        jsonfile.writeFile('lib/likely-subtags.json', _.fromPairs(
          _.map(
            result.supplementalData.likelySubtags[0].likelySubtag,
            mapping => [mapping['$'].from.replace(/_/g, '-'), mapping['$'].to.replace(/_/g, '-')])), {
          spaces: 2
        }, function (err) {
          console.error(err)
        })
      })
    })
  })
