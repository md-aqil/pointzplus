// __tests__/logger.test.ts – Verifies DEV gating of verbose logs (guardrail §4).
describe("logger", () => {
  let logger: typeof import("../lib/logger").logger;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    logger = require("../lib/logger").logger;
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("logs in DEV (__DEV__ is true in jest)", () => {
    logger.log("hello", 1);
    expect(logSpy).toHaveBeenCalledWith("hello", 1);
  });

  it("always emits errors", () => {
    const err = new Error("boom");
    logger.error(err);
    expect(errorSpy).toHaveBeenCalledWith(err);
  });

  it("formats structured errors in non-DEV", () => {
    const originalDev = (globalThis as any).__DEV__;
    try {
      (globalThis as any).__DEV__ = false;
      logger.error(new Error("boom"));
      expect(errorSpy).toHaveBeenCalledWith("[PointzPlus Error] boom");

      logger.error(undefined);
      expect(errorSpy).toHaveBeenCalledWith("[PointzPlus Error] Unknown error");

      logger.error("plain");
      expect(errorSpy).toHaveBeenCalledWith("[PointzPlus Error] plain");
    } finally {
      (globalThis as any).__DEV__ = originalDev;
    }
  });
});
