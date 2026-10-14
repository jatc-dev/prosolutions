import { logger } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should log error messages when level is ERROR', () => {
    logger.error('Test error message', { errorCode: 500 });

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', { errorCode: 500 });
  });

  it('should log warning messages when level is WARN', () => {
    logger.warn('Test warning message', { warningType: 'deprecated' });

    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message', {
      warningType: 'deprecated',
    });
  });

  it('should log info messages when level is INFO', () => {
    logger.info('Test info message', { userId: '123' });

    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message', { userId: '123' });
  });

  it('should not log debug messages when level is INFO', () => {
    logger.debug('Test debug message', { debugInfo: 'extra data' });

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should not log messages below the current level', () => {
    // In test mode, level defaults to INFO, so debug should not log
    logger.debug('This should log');
    expect(consoleLogSpy).not.toHaveBeenCalled();

    // Reset spy
    consoleLogSpy.mockClear();
  });
});
