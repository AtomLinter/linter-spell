#!/bin/sh

PACKAGE_VERSION=$(node -p "require('semver').inc(require('./package.json').version, '$1')")
github_changelog_generator --future-release $PACKAGE_VERSION
