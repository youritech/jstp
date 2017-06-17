'use strict';

let logger = null;

const set = l => logger = l;
const get = () => logger;

const isDebug = () => logger && logger.debug;
const isVerbose = () => logger && logger.verbose;
const isInfo = () => logger && logger.info;
const isWarn = () => logger && logger.warn;
const isError = () => logger && logger.error;

module.exports = {
  set,
  get,
  isDebug,
  isVerbose,
  isInfo,
  isWarn,
  isError
};
