/**
 * A facility for debug logging
 *
 * This is a very basic wrapper around react-native-logs; it is here so that if
 * we want to enhance features, change to a different logger, etc, we can
 * simply do it here rather than updating every source file that logs messages.
 *
 * Usage:
 *
 * import Logger from './Logger';
 * const log = Logger.scope('my module name');
 *
 * log.warn('watch out');
 * log.info('Just wanted you to know');
 * log.error('Uh oh...');
 *
 * @link https://www.npmjs.com/package/electron-log
 */
import { logger, consoleTransport, fileAsyncTransport } from 'react-native-logs';
import FileSystem from 'react-native-fs';

const config = {
  levels: {
    trace: 0,
    info: 1,
    log: 2,
    warn: 3,
    error: 4,
    devNotice: 5,
  },

  // what to report
  severity: __DEV__ ? 'debug' : 'error',

  transport: __DEV__ ? consoleTransport : fileAsyncTransport,

  transportOptions: {
    FS: FileSystem,
    fileName: 'logs.txt',

    colors: {
      devNotice: 'blue',
      info: 'blueBright',
      log: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
      trace: 'white',
    },
  },

  // disable reporting of selected modules to reduce the amount of logs
  //enabledExtensions: []
};

var log = logger.createLogger<
  'trace' | 'info' | 'log' | 'warn' | 'error' | 'devNotice'
>(config);

function scope(name) {
  return log.extend(name);
}

export { log, scope as loggerScope };
