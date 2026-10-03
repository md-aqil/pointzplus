// lib/logger.ts – Standardized logging utility for PointzPlus Mobile
// Follows CODE_GUARDRAILS §4: Dev-gated verbose logs; structured production error logging.

type LogArgs = unknown[];

export const logger = {
  /**
   * Verbose debug/info logs – strictly gated behind __DEV__ so production builds remain silent.
   */
  log: (...args: LogArgs): void => {
    if (__DEV__) {
      console.log(...args);
    }
  },

  /**
   * Informational logs – strictly gated behind __DEV__.
   */
  info: (...args: LogArgs): void => {
    if (__DEV__) {
      console.info(...args);
    }
  },

  /**
   * Warnings – emitted in DEV.
   */
  warn: (...args: LogArgs): void => {
    if (__DEV__) {
      console.warn(...args);
    }
  },

  /**
   * Errors – always logged with structured formatting.
   */
  error: (...args: LogArgs): void => {
    if (__DEV__) {
      console.error(...args);
    } else {
      const first = args[0];
      const message = first instanceof Error ? first.message : String(first ?? "Unknown error");
      console.error(`[PointzPlus Error] ${message}`);
    }
  },
};
