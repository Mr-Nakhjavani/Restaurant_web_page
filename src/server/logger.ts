type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const lvl = (process.env.LOG_LEVEL as Level) || "info";
  return ORDER[lvl] ?? ORDER.info;
}

/** Structured JSON-lines logger. Never pass raw phone numbers or tokens — mask them first. */
function log(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && process.env.LOG_IN_TESTS !== "true") return;
  if (ORDER[level] < threshold()) return;
  const line = JSON.stringify({ ...fields, time: new Date().toISOString(), level, msg, service: "bayt-al-ghaf" });
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, f?: Record<string, unknown>) => log("debug", msg, f),
  info: (msg: string, f?: Record<string, unknown>) => log("info", msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => log("warn", msg, f),
  error: (msg: string, f?: Record<string, unknown>) => log("error", msg, f),
};
