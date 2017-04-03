# `metarhia-jstp` changelog

## Version 0.6.8 (2017-03-03, @aqrln)

This is a tiny semver-patch release.

Notable changes:

 * **client:** handle errors in connectAndInspect
   *(Alexey Orlenko)*
   [#106](https://github.com/metarhia/JSTP/pull/106)

All changes:

 * **client:** handle errors in connectAndInspect
   *(Alexey Orlenko)*
   [#106](https://github.com/metarhia/JSTP/pull/106)
 * **src:** fix incorrect indentation in CodePointToUtf8
   *(Alexey Orlenko)*
   [#103](https://github.com/metarhia/JSTP/pull/103)
 * **test:** add Node.js 7.8 to .travis.yml
   *(Alexey Orlenko)*
   [#119](https://github.com/metarhia/JSTP/pull/119)

## Version 0.6.7 (2017-03-14, @aqrln)

This is a bugfix release.

Notable changes:

 * **lib:** make failed addon loading more informative
   *(Alexey Orlenko)*
   [#90](https://github.com/metarhia/JSTP/pull/90)
 * **w3c-ws:** emit missing error event
   *(Alexey Orlenko)*
   [#93](https://github.com/metarhia/JSTP/pull/93)
 * **w3c-ws:** fix invalid property access
   *(Alexey Orlenko)*
   [#94](https://github.com/metarhia/JSTP/pull/94)
 * **connection:** check that method arguments exist
   *(Alexey Orlenko)*
   [#100](https://github.com/metarhia/JSTP/pull/100)

All changes:

 * **doc:** fix linter warning in CHANGELOG.md
   *(Alexey Orlenko)*
   [#80](https://github.com/metarhia/JSTP/pull/80)
 * **tools:** remove crlf.js from dot-ignore files
   *(Alexey Orlenko)*
   [#83](https://github.com/metarhia/JSTP/pull/83)
 * **npm:** don't include doc/ and mkdocs.yml to package
   *(Alexey Orlenko)*
   [#82](https://github.com/metarhia/JSTP/pull/82)
 * **doc:** add session WG meeting
   *(Mykola Bilochub)*
   [#81](https://github.com/metarhia/JSTP/pull/81)
 * **lint:** update remark
   *(Alexey Orlenko)*
   [#87](https://github.com/metarhia/JSTP/pull/87)
 * **test:** add Node.js 6.10 and 7.6 to .travis.yml
   *(Alexey Orlenko)*
   [#86](https://github.com/metarhia/JSTP/pull/86)
 * **tools:** move build-native.js to tools
   *(Alexey Orlenko)*
   [#89](https://github.com/metarhia/JSTP/pull/89)
 * **lib:** make failed addon loading more informative
   *(Alexey Orlenko)*
   [#90](https://github.com/metarhia/JSTP/pull/90)
 * **w3c-ws:** emit missing error event
   *(Alexey Orlenko)*
   [#93](https://github.com/metarhia/JSTP/pull/93)
 * **w3c-ws:** fix invalid property access
   *(Alexey Orlenko)*
   [#94](https://github.com/metarhia/JSTP/pull/94)
 * **test:** add Node.js 7.7 to .travis.yml
   *(Alexey Orlenko)*
   [#95](https://github.com/metarhia/JSTP/pull/95)
 * **connection:** change style of a forward declaration
   *(Alexey Orlenko)*
   [#96](https://github.com/metarhia/JSTP/pull/96)
 * **lib:** change multiline function signatures style
   *(Alexey Orlenko)*
   [#97](https://github.com/metarhia/JSTP/pull/97)
 * **tools:** generate authors list automatically
   *(Alexey Orlenko)*
   [#88](https://github.com/metarhia/JSTP/pull/88)
 * **meta:** update AUTHORS and .mailmap
   *(Alexey Orlenko)*
   [#88](https://github.com/metarhia/JSTP/pull/88)
 * **meta:** fix misleading language in LICENSE
   *(Alexey Orlenko)*
   [#88](https://github.com/metarhia/JSTP/pull/88)
 * **connection:** check that method arguments exist
   *(Alexey Orlenko)*
   [#100](https://github.com/metarhia/JSTP/pull/100)

## Version 0.6.6 (2017-02-20, @aqrln)

This is mostly a bugfix release. Additionally, parser performance is improved.

Notable changes:

 * **server:** clean internal structures on close
   *(Alexey Orlenko)*
   [#59](https://github.com/metarhia/JSTP/pull/59)
 * **src,build:** add missing header
   *(Mykola Bilochub)*
   [#64](https://github.com/metarhia/JSTP/pull/64)
 * **parser:** make parser single-pass
   *(Mykola Bilochub)*
   [#61](https://github.com/metarhia/JSTP/pull/61)
 * **lib:** fix behavior with util.inspect
   *(Alexey Orlenko)*
   [#72](https://github.com/metarhia/JSTP/pull/72)
 * **parser:** fix bug causing node to crash
   *(Mykola Bilochub)*
   [#75](https://github.com/metarhia/JSTP/pull/75)
 * **server:** handle connection errors before handshake
   *(Alexey Orlenko)*
   [#78](https://github.com/metarhia/JSTP/pull/78)
 * **connection:** close connection on transport error
   *(Alexey Orlenko)*
   [#78](https://github.com/metarhia/JSTP/pull/78)

All changes:

 * **server:** clean internal structures on close
   *(Alexey Orlenko)*
   [#59](https://github.com/metarhia/JSTP/pull/59)
 * **src,build:** add missing header
   *(Mykola Bilochub)*
   [#64](https://github.com/metarhia/JSTP/pull/64)
 * **src:** add curly braces in `switch` statements
   *(Mykola Bilochub)*
   [#62](https://github.com/metarhia/JSTP/pull/62)
 * **build:** fail CI if native addon build fails
   *(Alexey Orlenko)*
   [#65](https://github.com/metarhia/JSTP/pull/65)
 * **parser:** make parser single-pass
   *(Mykola Bilochub)*
   [#61](https://github.com/metarhia/JSTP/pull/61)
 * **src:** fix single-line comment spacing
   *(Mykola Bilochub)*
   [#67](https://github.com/metarhia/JSTP/pull/67)
 * **parser:** improve string parsing
   *(Mykola Bilochub)*
   [#66](https://github.com/metarhia/JSTP/pull/66)
 * **src:** fix inconsistency in empty string creation
   *(Mykola Bilochub)*
   [#70](https://github.com/metarhia/JSTP/pull/70)
 * **doc:** document protocol versioning policy
   *(Alexey Orlenko)*
   [#56](https://github.com/metarhia/JSTP/pull/56)
 * **lib:** fix behavior with util.inspect
   *(Alexey Orlenko)*
   [#72](https://github.com/metarhia/JSTP/pull/72)
 * **deps,build:** update webpack to 2.x
   *(Alexey Orlenko)*
   [#73](https://github.com/metarhia/JSTP/pull/73)
 * **build,test:** avoid unnecessary recompiling
   *(Alexey Orlenko)*
   [#74](https://github.com/metarhia/JSTP/pull/74)
 * **doc:** update badges in README.md and doc/index.md
   *(Alexey Orlenko)*
   [#71](https://github.com/metarhia/JSTP/pull/71)
 * **parser:** fix bug causing node to crash
   *(Mykola Bilochub)*
   [#75](https://github.com/metarhia/JSTP/pull/75)
 * **tools:** automate the release preparation
   *(Alexey Orlenko)*
   [#77](https://github.com/metarhia/JSTP/pull/77)
 * **server:** handle connection errors before handshake
   *(Alexey Orlenko)*
   [#78](https://github.com/metarhia/JSTP/pull/78)
 * **connection:** close connection on transport error
   *(Alexey Orlenko)*
   [#78](https://github.com/metarhia/JSTP/pull/78)
