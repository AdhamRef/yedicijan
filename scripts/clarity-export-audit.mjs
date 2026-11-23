import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 100_000;

const HEADER_ALIASES = {
  session: ["session id", "sessionid", "session identifier"],
  timestamp: ["date", "timestamp", "session start", "start time"],
  event: ["event", "event name", "event type"],
  url: ["url", "page url", "path", "entry url", "landing page"],
  device: ["device", "device type"],
  browser: ["browser", "browser name"],
  os: ["os", "operating system"],
};

const SAFE_EVENTS = new Set([
  "landing_page_view",
  "page_view_change",
  "page_became_hidden",
  "page_visible_again",
  "first_scroll",
  "first_click",
  "rage_click",
  "donation_flow_started",
  "outbound_link_click",
  "dead_click",
  "quick_back",
  "excessive_scroll",
  "javascript_error",
  "page_error",
]);

const SAFE_ROUTE_SEGMENTS = new Set([
  "projects",
  "project",
  "campaigns",
  "campaign",
  "categories",
  "category",
  "zakat",
  "winter",
  "gaza",
  "donation",
  "donate",
  "cart",
  "checkout",
  "payment",
  "albaraka",
  "payfor",
  "stripe",
  "success",
  "donation-failed",
]);

const LOCALES = new Set(["ar", "en", "fr", "tr", "id", "pt", "es", "de"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizedHeader(value) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function resolveColumns(headers) {
  const normalized = headers.map(normalizedHeader);
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      normalized.findIndex((header) => aliases.includes(header)),
    ]),
  );
}

function safeRoute(value) {
  if (!value) return null;
  try {
    const pathname = new URL(value, "https://local.invalid").pathname;
    const segments = pathname.split("/").filter(Boolean);
    const normalized = segments.map((segment, index) => {
      const lower = segment.toLowerCase();
      if (index === 0 && LOCALES.has(lower)) return lower;
      if (SAFE_ROUTE_SEGMENTS.has(lower)) return lower;
      if (/^(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(segment)) return ":id";
      return ":route";
    });
    return `/${normalized.join("/")}` || "/";
  } catch {
    return null;
  }
}

function safeEvent(value) {
  const event = value.trim().toLowerCase();
  return SAFE_EVENTS.has(event) ? event : null;
}

function safeDevice(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("mobile") || normalized.includes("phone")) return "mobile";
  if (normalized.includes("tablet") || normalized.includes("ipad")) return "tablet";
  if (normalized.includes("desktop") || normalized.includes("pc")) return "desktop";
  return value ? "other" : null;
}

function safeBrowser(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("edge")) return "edge";
  if (normalized.includes("chrome") || normalized.includes("chromium")) return "chrome";
  if (normalized.includes("firefox")) return "firefox";
  if (normalized.includes("safari")) return "safari";
  return value ? "other" : null;
}

function safeOs(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("android")) return "android";
  if (normalized.includes("ios") || normalized.includes("iphone") || normalized.includes("ipad")) return "ios";
  if (normalized.includes("windows")) return "windows";
  if (normalized.includes("mac")) return "macos";
  if (normalized.includes("linux")) return "linux";
  return value ? "other" : null;
}

function addCount(target, key) {
  if (key !== null) target[key] = (target[key] ?? 0) + 1;
}

function parseTimestamp(value) {
  if (!value.trim()) return null;
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00Z`
    : value.trim();
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function auditClarityCsv(csvText) {
  if (Buffer.byteLength(csvText, "utf8") > MAX_INPUT_BYTES) {
    throw new Error("CSV exceeds the 25 MiB input limit.");
  }

  const [headers, ...rows] = parseCsv(csvText);
  if (!headers) throw new Error("CSV is empty.");
  if (rows.length > MAX_ROWS) throw new Error("CSV exceeds the 100,000-row limit.");

  const columns = resolveColumns(headers);
  if (columns.session < 0 && columns.timestamp < 0 && columns.event < 0 && columns.url < 0) {
    throw new Error("CSV has no recognized session, date, event, or URL columns.");
  }

  const sessionIds = new Set();
  const sessionsWithEvents = new Set();
  const events = {};
  const routes = {};
  const byDayUtc = {};
  const byHourUtc = {};
  const devices = {};
  const browsers = {};
  const operatingSystems = {};
  let rowsWithTimestamp = 0;
  let rowsWithEvent = 0;
  let unclassifiedEventRows = 0;

  for (const row of rows) {
    const value = (column) => (column < 0 ? "" : row[column] ?? "");
    const sessionId = value(columns.session).trim();
    const timestamp = parseTimestamp(value(columns.timestamp));
    const eventValue = value(columns.event);
    const event = eventValue ? safeEvent(eventValue) : null;
    const route = safeRoute(value(columns.url));

    if (sessionId) sessionIds.add(sessionId);
    if (timestamp) {
      rowsWithTimestamp += 1;
      addCount(byDayUtc, timestamp.slice(0, 10));
      addCount(byHourUtc, timestamp.slice(0, 13));
    }
    addCount(routes, route);
    addCount(devices, safeDevice(value(columns.device)));
    addCount(browsers, safeBrowser(value(columns.browser)));
    addCount(operatingSystems, safeOs(value(columns.os)));

    if (eventValue) {
      rowsWithEvent += 1;
      if (event) {
        events[event] ??= { rows: 0, sessions: new Set() };
        events[event].rows += 1;
        if (sessionId) {
          events[event].sessions.add(sessionId);
          sessionsWithEvents.add(sessionId);
        }
      } else {
        unclassifiedEventRows += 1;
      }
    }
  }

  const eventInventory = Object.fromEntries(
    Object.entries(events)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, counts]) => [name, { rows: counts.rows, sessions: counts.sessions.size }]),
  );
  const orderedDays = Object.keys(byDayUtc).sort();

  return {
    coverage: {
      rows: rows.length,
      sessions: columns.session < 0 ? null : sessionIds.size,
      sessionsWithClassifiedEvents: columns.session < 0 ? null : sessionsWithEvents.size,
      rowsWithTimestamp,
      rowsWithEvent,
      unclassifiedEventRows,
      utcDateRange: orderedDays.length ? { first: orderedDays[0], last: orderedDays.at(-1) } : null,
    },
    events: eventInventory,
    routes,
    byDayUtc,
    byHourUtc,
    devices,
    browsers,
    operatingSystems,
    limitations: [
      "Counts describe only supplied CSV rows; they do not prove all available sessions were exported or replayed.",
      "Only reviewed, allowlisted event names are printed; other event labels are counted but suppressed.",
      "URLs are reduced to locale and allowlisted route segments; query strings, fragments, and unknown segments are discarded.",
      "No session identifiers, user identifiers, referrers, campaign values, click IDs, or recording links are emitted.",
      "Paid/organic status and donation settlement are not inferred from traffic tags or page events.",
    ],
  };
}

async function readStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_INPUT_BYTES) throw new Error("CSV exceeds the 25 MiB input limit.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = auditClarityCsv(await readStdin());
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Unable to process CSV."}\n`);
    process.exitCode = 1;
  }
}
