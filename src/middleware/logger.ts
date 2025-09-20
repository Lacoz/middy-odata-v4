export type ODataLogLevel = "silent" | "error" | "warn" | "info" | "debug";

export interface ODataLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface CreateODataLoggerOptions {
  level?: ODataLogLevel;
  logger?: Partial<ODataLogger> | ODataLogger;
  prefix?: string;
}

const LEVEL_PRIORITY: Record<ODataLogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const NOOP = () => {};

function resolveLoggerMethod(
  logger: Partial<ODataLogger> | ODataLogger | undefined,
  method: keyof ODataLogger,
): (...args: unknown[]) => void {
  if (logger && typeof (logger as ODataLogger)[method] === "function") {
    return ((logger as ODataLogger)[method] as (...args: unknown[]) => void).bind(logger);
  }

  const fallbackConsole = typeof console !== "undefined" ? console : undefined;
  const fallback = fallbackConsole?.[method] ?? fallbackConsole?.log;
  return typeof fallback === "function" ? fallback.bind(fallbackConsole) : NOOP;
}

function wrapWithPrefix(
  method: (...args: unknown[]) => void,
  prefix?: string,
): (...args: unknown[]) => void {
  if (!prefix) {
    return method;
  }
  return (...args: unknown[]) => method(prefix, ...args);
}

export function createODataLogger(options: CreateODataLoggerOptions = {}): ODataLogger {
  const { level = "warn", logger, prefix } = options;
  const debugTarget = wrapWithPrefix(resolveLoggerMethod(logger, "debug"), prefix);
  const infoTarget = wrapWithPrefix(resolveLoggerMethod(logger, "info"), prefix);
  const warnTarget = wrapWithPrefix(resolveLoggerMethod(logger, "warn"), prefix);
  const errorTarget = wrapWithPrefix(resolveLoggerMethod(logger, "error"), prefix);

  const currentLevel = LEVEL_PRIORITY[level] ?? LEVEL_PRIORITY.warn;

  return {
    debug: currentLevel >= LEVEL_PRIORITY.debug ? debugTarget : NOOP,
    info: currentLevel >= LEVEL_PRIORITY.info ? infoTarget : NOOP,
    warn: currentLevel >= LEVEL_PRIORITY.warn ? warnTarget : NOOP,
    error: currentLevel >= LEVEL_PRIORITY.error ? errorTarget : NOOP,
  };
}

export function deriveLogger(base: ODataLogger | undefined, prefix: string): ODataLogger {
  if (!base) {
    return createODataLogger({ level: "warn", prefix });
  }

  return {
    debug: (...args: unknown[]) => base.debug(prefix, ...args),
    info: (...args: unknown[]) => base.info(prefix, ...args),
    warn: (...args: unknown[]) => base.warn(prefix, ...args),
    error: (...args: unknown[]) => base.error(prefix, ...args),
  };
}
