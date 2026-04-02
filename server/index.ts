import fs from "node:fs";
import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { parse as parseUrl, type UrlWithParsedQuery } from "node:url";

import { loadEnvConfig } from "@next/env";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const standaloneConfig = loadStandaloneConfig();

const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const defaultPort = 3000;
const parsedPort = Number.parseInt(process.env.PORT ?? String(defaultPort), 10);
const port =
  Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort;

const logger = createLogger();
const flightValidator = loadFlightValidator();

const app = next({ dev, hostname, port, conf: standaloneConfig ?? undefined });
type RequestHandler = ReturnType<typeof app.getRequestHandler>;
type UpgradeHandler = ReturnType<typeof app.getUpgradeHandler>;

let handle: RequestHandler | null = null;
let upgrade: UpgradeHandler | null = null;

const BAD_REQUEST_PATTERNS: readonly RegExp[] = [
  /router state header was sent but could not be parsed/i,
  /router state header was too large/i,
  /multiple router state headers were sent/i,
  /failed to find server action/i,
];

app
  .prepare()
  .then(() => {
    handle = app.getRequestHandler();
    upgrade = app.getUpgradeHandler();

    const server = http.createServer((req, res) => {
      void requestListener(req, res);
    });

    server.on("upgrade", (req, socket, head) => {
      if (!upgrade) {
        socket.destroy();
        return;
      }

      try {
        upgrade(req, socket, head);
      } catch (error) {
        logger.error({ err: error }, "Unhandled upgrade error");
        socket.destroy(asError(error));
      }
    });

    server.on("clientError", (error, socket) => {
      logger.warn({ err: error }, "Client connection error");
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    });

    server.listen(port, hostname, () => {
      logger.info({ port, hostname }, "Ready on http server");
    });

    setupProcessHandlers(server);
  })
  .catch((error) => {
    logger.fatal({ err: error }, "Failed to start Next.js application");
    process.exit(1);
  });

async function requestListener(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!validateFlightHeaders(req, res)) {
    return;
  }

  if (!handle) {
    logger.warn(
      { path: req.url },
      "Request received before Next handler ready",
    );
    sendResponse(res, 503, "Service Unavailable");
    return;
  }

  try {
    const parsedUrl: UrlWithParsedQuery | undefined = req.url
      ? (parseUrl(req.url, true) as UrlWithParsedQuery)
      : undefined;
    await handle(req, res, parsedUrl);
  } catch (error) {
    if (isInvalidUrlError(error)) {
      logger.warn({ err: error, path: req.url }, "Handled invalid URL error");
      sendResponse(res, 400, "Bad Request");
      return;
    }

    if (isBadRequestError(error)) {
      logger.warn(
        { err: error, path: req.url },
        "Handled bad request for Next flight payload",
      );
      sendResponse(res, 400, "Bad Request");
      return;
    }

    logger.error({ err: error, path: req.url }, "Unhandled Next.js error");
    sendResponse(res, 500, "Internal Server Error");
  }
}

function validateFlightHeaders(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (!flightValidator) {
    return true;
  }

  const header = req.headers["next-router-state-tree"];
  if (typeof header === "undefined") {
    return true;
  }

  try {
    flightValidator(header);
    return true;
  } catch (error) {
    if (isBadRequestError(error)) {
      logger.warn(
        { err: error, path: req.url },
        "Rejected request with invalid router state header",
      );
      sendResponse(res, 400, "Bad Request");
      return false;
    }

    throw error;
  }
}

function loadFlightValidator(): FlightRouterValidator | null {
  try {
    const mod =
      require("next/dist/server/app-render/parse-and-validate-flight-router-state") as {
        parseAndValidateFlightRouterState: FlightRouterValidator;
      };
    return mod.parseAndValidateFlightRouterState;
  } catch (error) {
    logger.debug({ err: error }, "Unable to load Next flight validator module");
    return null;
  }
}

type FlightRouterValidator = (stateHeader: string | string[]) => unknown;

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

type Logger = {
  [Level in LogLevel]: (...args: unknown[]) => void;
} & {
  child: () => Logger;
  level: string;
};

function createLogger(): Logger {
  const level = process.env.LOG_LEVEL ?? (dev ? "debug" : "info");

  try {
    const pino = require("pino");
    return (pino as any)({ level }) as Logger;
  } catch (error) {
    const levels: LogLevel[] = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ];
    const consoleLogger: Partial<Logger> = {};

    levels.forEach((logLevel) => {
      const method = mapLevelToConsoleMethod(logLevel);
      const consoleMethod = console[method] ?? console.log;
      consoleLogger[logLevel] = consoleMethod.bind(
        console,
        `[${logLevel.toUpperCase()}]`,
      );
    });

    consoleLogger.child = () => consoleLogger as Logger;
    consoleLogger.level = level;

    return consoleLogger as Logger;
  }
}

function mapLevelToConsoleMethod(
  level: LogLevel,
): "log" | "info" | "warn" | "error" | "debug" {
  switch (level) {
    case "trace":
    case "debug":
      return "debug";
    case "info":
      return "info";
    case "warn":
      return "warn";
    case "error":
    case "fatal":
      return "error";
    default:
      return "log";
  }
}

function collectMessages(error: unknown): string[] {
  if (error == null) {
    return [];
  }

  const messages = new Set<string>();
  const visited = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length > 0 && messages.size <= 10) {
    const current = queue.shift();

    if (current == null) {
      continue;
    }

    if (
      (typeof current === "object" || typeof current === "function") &&
      visited.has(current)
    ) {
      continue;
    }

    if (typeof current === "string") {
      messages.add(current);
      continue;
    }

    if (isError(current)) {
      messages.add(current.message);
      if (current.cause !== undefined) {
        queue.push(current.cause);
      }
      visited.add(current);
      continue;
    }

    if (typeof current === "object" || typeof current === "function") {
      visited.add(current);
    }

    try {
      messages.add(String(current));
    } catch (stringifyError) {
      logger.debug(
        { stringifyError: asError(stringifyError)?.message },
        "Failed to stringify error message",
      );
    }
  }

  return Array.from(messages);
}

function isInvalidUrlError(error: unknown): boolean {
  if (!isError(error)) {
    return false;
  }

  return (
    error instanceof TypeError &&
    "code" in error &&
    error.code === "ERR_INVALID_URL"
  );
}

function isBadRequestError(error: unknown): boolean {
  return collectMessages(error).some((message) =>
    BAD_REQUEST_PATTERNS.some((pattern) => pattern.test(message)),
  );
}

function sendResponse(
  res: ServerResponse,
  statusCode: number,
  body: string,
): void {
  if (res.headersSent) {
    if (!res.writableEnded) {
      res.end();
    }
    return;
  }

  res.statusCode = statusCode;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(body);
}

function setupProcessHandlers(server: Server): void {
  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Received shutdown signal");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error: unknown) => {
    logger.error({ err: error }, "Uncaught exception");
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
}

function loadStandaloneConfig(): Record<string, unknown> | null {
  if (dev) {
    return null;
  }

  const configPath = path.join(
    process.cwd(),
    ".next",
    "required-server-files.json",
  );

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as { config?: Record<string, unknown> };
    if (parsed && typeof parsed === "object" && parsed.config) {
      process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(
        parsed.config,
      );
      return parsed.config;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
      console.warn("Failed to load Next.js standalone config", error);
    }
  }

  return null;
}

function asError(value: unknown): Error | undefined {
  return value instanceof Error ? value : undefined;
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}
