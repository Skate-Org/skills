import { Transform } from "node:stream";

const REDACTED = "<redacted>";

const KW =
  "api[_-]?key|api[Kk]ey|access[_-]?token|auth[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|webhook[_-]?secret|private[_-]?key|signing[_-]?secret|token|secret|password|passwd|pwd|passphrase|credential";

const KW_SPACED =
  "api[\\s_-]?key|access[\\s_-]?token|auth[\\s_-]?token|refresh[\\s_-]?token|id[\\s_-]?token|client[\\s_-]?secret|webhook[\\s_-]?secret|private[\\s_-]?key|signing[\\s_-]?secret|secret|password|passphrase|credential|\\btoken\\b";

const KW_TOKEN_FIRST =
  "api[\\s_-]?key|access[\\s_-]?token|auth[\\s_-]?token|refresh[\\s_-]?token|id[\\s_-]?token|client[\\s_-]?secret|webhook[\\s_-]?secret|signing[\\s_-]?secret|password|passphrase";

const RE_GOOGLE = /\bAIza[0-9A-Za-z_-]{35}\b/g;
const RE_AWS = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g;
const RE_GH_PAT = /\bgh[opusr]_[A-Za-z0-9]{30,}\b/g;
const RE_SLACK = /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g;
const RE_GH_FINE = /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g;
const RE_GOOGLE_OAUTH = /\bya29\.[0-9A-Za-z_-]{20,}\b/g;

const RE_SK_DASH =
  /\bsk-(?:proj-|live-|test-|or-v\d-|ant-)?[A-Za-z0-9_-]{20,}\b/g;
const RE_JWT =
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const RE_STRIPE = /\b(?:pk|sk|rk|whsec)_(?:live|test)_[A-Za-z0-9]{16,}\b/g;

const RE_PEM =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;

const RE_CONN_STRING =
  /\b((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|sftp|ftps?|ldaps?|https?):\/\/[^:/\s@]+:)([^@\s/]+)(@)/gi;

const RE_URL_PARAM = new RegExp(`([?&](?:${KW})=)([^&\\s"'<>]+)`, "gi");

const RE_JSON_KV = new RegExp(
  `(["'](?:${KW})["']\\s*:\\s*["'])([^"']+)(["'])`,
  "gi",
);

const RE_PHRASE_KEYWORD_FIRST = new RegExp(
  `((?:${KW_SPACED})\\s*(?:as|is|was|=|:)\\s*["']?)([A-Za-z0-9_\\-.]{12,})`,
  "gi",
);

const RE_PHRASE_TOKEN_FIRST = new RegExp(
  `\\b([A-Za-z0-9_\\-.]{12,})(["']?\\s+(?:is(?:n'?t)?|was(?:n'?t)?|are(?:n'?t)?|appears(?:\\s+(?:as|to\\s+be))?|(?:was\\s+|is\\s+|been\\s+|has\\s+been\\s+)?(?:detected|identified|recognized|used|known)\\s+as)(?:\\s+(?:your|the|an?|my|our|not|valid|invalid|a\\s+valid))*\\s+(?:${KW_TOKEN_FIRST}))`,
  "gi",
);

const RE_AUTH_HEADER =
  /\b(Authorization|Proxy-Authorization|X-API-Key|X-Api-Key|X-Auth-Token|X-Access-Token|X-CSRF-Token|X-Session-Token)([:=]?\s*(?:Bearer|Basic|Token|Digest|MAC)?\s+)([A-Za-z0-9_\-.=+/]{8,})/gi;

const RE_BEARER_BARE = /\b(Bearer|Basic|Token)\s+([A-Za-z0-9_\-.=+/]{12,})/g;

const RE_COOKIE_HEADER = /((?:Set-)?Cookie:\s*)([^\r\n]+)/gi;
const RE_AUTH_COOKIE_NAME =
  /\b(session(?:id|_id|_token)?|auth(?:_token)?|access[_-]?token|refresh[_-]?token|id[_-]?token|csrf|xsrf|sid|jwt|connect\.sid|token|api[_-]?key)=([^;\s]+)/gi;

export function redactText(input: string): string {
  let out = input;

  out = out.replace(RE_AWS, REDACTED);
  out = out.replace(RE_JWT, REDACTED);
  out = out.replace(RE_PEM, REDACTED);
  out = out.replace(RE_SLACK, REDACTED);
  out = out.replace(RE_GH_PAT, REDACTED);
  out = out.replace(RE_GOOGLE, REDACTED);
  out = out.replace(RE_STRIPE, REDACTED);
  out = out.replace(RE_GH_FINE, REDACTED);
  out = out.replace(RE_SK_DASH, REDACTED);
  out = out.replace(RE_GOOGLE_OAUTH, REDACTED);

  out = out.replace(
    RE_CONN_STRING,
    (_m, prefix, _pw, suffix) => `${prefix}${REDACTED}${suffix}`,
  );

  out = out.replace(RE_URL_PARAM, (_m, prefix) => `${prefix}${REDACTED}`);

  out = out.replace(
    RE_JSON_KV,
    (_m, prefix, _val, suffix) => `${prefix}${REDACTED}${suffix}`,
  );

  out = out.replace(
    RE_PHRASE_KEYWORD_FIRST,
    (_m, prefix) => `${prefix}${REDACTED}`,
  );

  out = out.replace(
    RE_PHRASE_TOKEN_FIRST,
    (_m, _token, suffix) => `${REDACTED}${suffix}`,
  );

  out = out.replace(
    RE_AUTH_HEADER,
    (_m, name, sep) => `${name}${sep}${REDACTED}`,
  );

  out = out.replace(RE_BEARER_BARE, (_m, scheme) => `${scheme} ${REDACTED}`);

  out = out.replace(RE_COOKIE_HEADER, (_m, prefix, value) => {
    const scrubbed = value.replace(
      RE_AUTH_COOKIE_NAME,
      (_mm: string, name: string) => `${name}=${REDACTED}`,
    );

    return `${prefix}${scrubbed}`;
  });

  return out;
}

const TOKEN_CHAR_RE = /[A-Za-z0-9_\-.]/;
const KEYWORD_RE =
  /api[\s_-]?key|access[\s_-]?token|auth[\s_-]?token|refresh[\s_-]?token|id[\s_-]?token|client[\s_-]?secret|webhook[\s_-]?secret|signing[\s_-]?secret|private[\s_-]?key|secret|bearer|authorization|x-api-key|x-auth-token|x-csrf-token|x-access-token|proxy-authorization|password|passphrase|credential|cookie|\btoken\b|\bsk-|sk_(?:live|test)_|pk_(?:live|test)_|rk_(?:live|test)_|whsec_|xox[abprs]-|gh[opusr]_|github_pat_|AKIA|ASIA|AIza|ya29\.|eyJ/i;

const LOOKBACK = 2048;
const MAX_PATTERN_LEN = 256;

const RE_PEM_BEGIN = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;
const RE_PEM_END = /-----END [A-Z0-9 ]*PRIVATE KEY-----/;

function findSafeBoundary(buf: string): number {
  if (buf.length <= LOOKBACK + MAX_PATTERN_LEN) {
    return 0;
  }

  let snapFloor = 0;
  let cut = buf.length - LOOKBACK;
  const pemBegin = buf.search(RE_PEM_BEGIN);

  if (pemBegin !== -1) {
    const m = RE_PEM_END.exec(buf.slice(pemBegin));
    const pemEnd = m ? pemBegin + m.index + m[0].length : -1;

    if (pemEnd === -1) {
      cut = Math.min(cut, pemBegin);
    } else if (cut > pemBegin && cut < pemEnd) {
      cut = pemBegin;
    } else if (cut >= pemEnd) {
      snapFloor = pemEnd;
    }

    if (cut <= snapFloor) {
      return 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    const start = Math.max(snapFloor, cut - MAX_PATTERN_LEN);
    const end = Math.min(buf.length, cut + MAX_PATTERN_LEN);

    if (start >= end || !KEYWORD_RE.test(buf.slice(start, end))) {
      break;
    }

    cut -= MAX_PATTERN_LEN * 2;
    if (cut <= snapFloor) {
      return 0;
    }
  }

  for (let i = cut; i >= snapFloor; i--) {
    if (TOKEN_CHAR_RE.test(buf[i] ?? "")) {
      continue;
    }

    const ks = Math.max(snapFloor, i - MAX_PATTERN_LEN);
    const ke = Math.min(buf.length, i + MAX_PATTERN_LEN);

    if (KEYWORD_RE.test(buf.slice(ks, ke))) {
      continue;
    }

    return i + 1;
  }

  return 0;
}

export function createRedactStream(): Transform {
  let pending = "";

  return new Transform({
    transform(chunk: Buffer | string, _enc, cb) {
      pending += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      const cut = findSafeBoundary(pending);

      if (cut > 0) {
        const head = redactText(pending.slice(0, cut));
        pending = pending.slice(cut);

        cb(null, head);
      } else {
        cb();
      }
    },
    flush(cb) {
      const tail = redactText(pending);
      pending = "";

      cb(null, tail);
    },
  });
}
