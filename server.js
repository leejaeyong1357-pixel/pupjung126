#!/usr/bin/env node
/* 테크젠 사외직무교육 계획 취합 — 로컬 서버
 *
 *   node server.js            기본 3000 포트
 *   PORT=8080 node server.js  포트 변경
 *
 * 외부 패키지를 쓰지 않습니다. Node 18 이상이면 그대로 실행됩니다.
 * 데이터는 data/plans.json 한 파일에 저장되므로 그 파일만 복사하면 백업이 됩니다.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const ORGLIB = require("./public/org.js");
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const PLANS_FILE = path.join(DATA, "plans.json");
const ROSTER_FILE = path.join(DATA, "roster.json");
const SECRET_FILE = path.join(DATA, ".secret");
const PORT = Number(process.env.PORT) || 3000;
const YEAR = 2027;

/* ---------- 저장소 ---------- */
fs.mkdirSync(DATA, { recursive: true });

const ROSTER = JSON.parse(fs.readFileSync(ROSTER_FILE, "utf8"));
const BY_EMP = new Map(ROSTER.map(p => [String(p.emp), p]));
const ALL_TEAMS = [...new Set(ROSTER.map(p => p.dept))].sort();

let PLANS = [];
try { PLANS = JSON.parse(fs.readFileSync(PLANS_FILE, "utf8")); }
catch { PLANS = []; }

/* 쓰기를 한 줄로 직렬화해서 동시 저장이 서로를 덮어쓰지 않게 합니다. */
let writeChain = Promise.resolve();
function persist() {
  writeChain = writeChain.then(async () => {
    const tmp = PLANS_FILE + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(PLANS, null, 1), "utf8");
    await fsp.rename(tmp, PLANS_FILE);          // 덮어쓰기 중 정전이 나도 원본이 남습니다
  }).catch(err => console.error("[저장 실패]", err.message));
  return writeChain;
}

/* ---------- 로그인 토큰 ---------- */
let SECRET;
try { SECRET = fs.readFileSync(SECRET_FILE, "utf8").trim(); }
catch {
  SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, SECRET, { mode: 0o600 });
}
const sign = emp => crypto.createHmac("sha256", SECRET).update(String(emp)).digest("base64url");
const makeToken = emp => `${Buffer.from(String(emp)).toString("base64url")}.${sign(emp)}`;
function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [b64, mac] = token.split(".");
  let emp;
  try { emp = Buffer.from(b64, "base64url").toString("utf8"); } catch { return null; }
  const want = sign(emp);
  if (mac.length !== want.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  return BY_EMP.get(emp) || null;
}
const cookieOf = (req, name) =>
  (req.headers.cookie || "").split(";").map(s => s.trim())
    .find(s => s.startsWith(name + "="))?.slice(name.length + 1);

/* ---------- 유틸 ---------- */
const send = (res, code, body, headers = {}) => {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(code, { "Content-Length": buf.length, ...headers });
  res.end(buf);
};
const json = (res, code, obj, headers = {}) =>
  send(res, code, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", ...headers });
const fail = (res, code, message) => json(res, code, { error: message });

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > limit) { reject(new Error("요청이 너무 큽니다")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("잘못된 요청 형식입니다")); }
    });
    req.on("error", reject);
  });
}

const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const num = v => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return isFinite(n) ? n : 0; };
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
function daysBetween(a, b) {
  const d = (new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000;
  return d < 0 ? 0 : Math.round(d) + 1;
}

/* 이 사람이 볼 수 있는 계획에 권한 플래그를 붙여 내려보냅니다. */
function visibleFor(me) {
  const teams = new Set(ORGLIB.scopeOf(me, ALL_TEAMS).teams);
  return PLANS.filter(p => p.year === YEAR && teams.has(p.dept)).map(p => ({
    ...p,
    _edit: ORGLIB.canEditRow(me, p),
    _appr: ORGLIB.canApprove(me, p.dept),
  }));
}
function bootstrap(me) {
  const scope = ORGLIB.scopeOf(me, ALL_TEAMS);
  const set = new Set(scope.teams);
  return {
    me: { emp: me.emp, name: me.name, dept: me.dept, position: me.position, grade: me.grade, role: me.role },
    scope, year: YEAR,
    deadline: ORGLIB.DEADLINE, closed: ORGLIB.isClosed(), canWrite: ORGLIB.canWrite(me),
    isAdmin: ORGLIB.isAdmin(me),
    allTeams: ALL_TEAMS,
    org: ORGLIB.ORG,
    roster: ROSTER.filter(p => set.has(p.dept))
      .map(p => ({ emp: p.emp, name: p.name, dept: p.dept, position: p.position, grade: p.grade })),
    plans: visibleFor(me),
  };
}

/* 입력값을 서버에서 다시 검증합니다. 브라우저 쪽 검사만 믿지 않습니다. */
function validate(body, me) {
  const jobType = body.jobType === "생산직" ? "생산직" : "관리직";
  let person;
  if (jobType === "관리직") {
    person = BY_EMP.get(str(body.emp, 20));
    if (!person) return { error: "대상자를 명단에서 찾을 수 없습니다." };
    person = { emp: person.emp, name: person.name, dept: person.dept, grade: person.grade };
  } else {
    const emp = str(body.emp, 20).replace(/\D/g, ""), name = str(body.name, 40);
    if (!emp || !name) return { error: "생산직 대상자의 사번과 성명을 입력해 주세요." };
    person = { emp, name, dept: str(body.dept, 60), grade: str(body.grade, 40) || "생산직" };
  }
  const allowed = new Set(ORGLIB.writableTeams(me, ALL_TEAMS));
  if (!allowed.has(person.dept)) return { error: "이 부서에는 등록할 권한이 없습니다." };

  const start = str(body.start, 10), end = str(body.end, 10);
  if (!isDate(start) || !isDate(end)) return { error: "교육 시작일과 종료일을 선택해 주세요." };
  if (end < start) return { error: "종료일이 시작일보다 빠릅니다." };
  if (!start.startsWith(String(YEAR)) || !end.startsWith(String(YEAR)))
    return { error: `${YEAR}년 교육계획만 등록할 수 있습니다.` };

  const org = str(body.org, 120), course = str(body.course, 200), place = str(body.place, 80);
  if (!org || !course || !place) return { error: "교육기관 · 교육과정 · 교육장소를 모두 입력해 주세요." };
  const hours = num(body.hours), cost = Math.round(num(body.cost));
  if (!(hours > 0)) return { error: "교육시간을 시간 단위 숫자로 입력해 주세요." };
  if (cost < 0) return { error: "교육비를 원 단위 숫자로 입력해 주세요." };

  return {
    value: {
      year: YEAR, jobType, ...person,
      category: str(body.category, 30) || "직무전문",
      org, course, start, end, days: daysBetween(start, end),
      place, hours, cost,
    },
  };
}

/* ---------- 라우팅 ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".json": "application/json; charset=utf-8" };

async function api(req, res, url, me) {
  const p = url.pathname;

  if (p === "/api/login" && req.method === "POST") {
    const b = await readBody(req);
    const emp = str(b.emp, 20).replace(/\D/g, ""), name = str(b.name, 40);
    if (!emp || !name) return fail(res, 400, "성명과 사번을 모두 입력해 주세요.");
    const person = BY_EMP.get(emp);
    if (!person) return fail(res, 401, `사번 ${emp} 을(를) 명단에서 찾을 수 없습니다.`);
    if (person.name !== name) return fail(res, 401, "사번과 성명이 일치하지 않습니다.");
    return json(res, 200, bootstrap(person), {
      "Set-Cookie": `tz=${makeToken(emp)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`,
    });
  }
  if (p === "/api/logout" && req.method === "POST")
    return json(res, 200, { ok: true }, { "Set-Cookie": "tz=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });

  if (p === "/api/bootstrap" && req.method === "GET")
    return json(res, 200, me ? bootstrap(me) : { me: null, year: YEAR });

  if (!me) return fail(res, 401, "로그인이 필요합니다.");

  if (p === "/api/plans" && req.method === "GET")
    return json(res, 200, { plans: visibleFor(me) });

  if (p === "/api/plans" && req.method === "POST") {
    if (!ORGLIB.canWrite(me))
      return fail(res, 403, `취합이 ${ORGLIB.DEADLINE} 에 마감되었습니다. 추가 등록은 미래성장팀으로 문의해 주세요.`);
    const v = validate(await readBody(req), me);
    if (v.error) return fail(res, 400, v.error);
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(), ...v.value,
      status: "pending", rejectReason: "", decidedBy: "", decidedByEmp: "", decidedAt: "",
      createdBy: me.emp, createdByName: me.name, createdAt: now, updatedAt: now,
    };
    PLANS.push(row); await persist();
    return json(res, 200, { plan: row });
  }

  const m = p.match(/^\/api\/plans\/([\w-]+)(\/approve|\/reject)?$/);
  if (m) {
    const row = PLANS.find(r => r.id === m[1]);
    if (!row) return fail(res, 404, "해당 교육계획을 찾을 수 없습니다.");

    if (m[2] === "/approve" && req.method === "POST") {
      if (!ORGLIB.canApprove(me, row.dept)) return fail(res, 403, "승인 권한이 없습니다.");
      Object.assign(row, { status: "approved", rejectReason: "",
        decidedBy: me.name, decidedByEmp: me.emp, decidedAt: new Date().toISOString() });
      await persist(); return json(res, 200, { plan: row });
    }
    if (m[2] === "/reject" && req.method === "POST") {
      if (!ORGLIB.canApprove(me, row.dept)) return fail(res, 403, "반려 권한이 없습니다.");
      const reason = str((await readBody(req)).reason, 1000);
      if (!reason) return fail(res, 400, "반려 사유를 입력해 주세요.");
      Object.assign(row, { status: "rejected", rejectReason: reason,
        decidedBy: me.name, decidedByEmp: me.emp, decidedAt: new Date().toISOString() });
      await persist(); return json(res, 200, { plan: row });
    }
    if (!m[2] && req.method === "PUT") {
      if (!ORGLIB.canEditRow(me, row)) return fail(res, 403, "본인이 등록한 계획만 수정할 수 있습니다.");
      if (!ORGLIB.canWrite(me))
        return fail(res, 403, `취합이 ${ORGLIB.DEADLINE} 에 마감되어 수정할 수 없습니다.`);
      const v = validate(await readBody(req), me);
      if (v.error) return fail(res, 400, v.error);
      Object.assign(row, v.value, { status: "pending", rejectReason: "",
        decidedBy: "", decidedByEmp: "", decidedAt: "", updatedAt: new Date().toISOString() });
      await persist(); return json(res, 200, { plan: row });
    }
    if (!m[2] && req.method === "DELETE") {
      if (!ORGLIB.canEditRow(me, row)) return fail(res, 403, "본인이 등록한 계획만 삭제할 수 있습니다.");
      if (!ORGLIB.canWrite(me))
        return fail(res, 403, `취합이 ${ORGLIB.DEADLINE} 에 마감되어 삭제할 수 없습니다.`);
      PLANS = PLANS.filter(r => r.id !== row.id); await persist();
      return json(res, 200, { ok: true });
    }
  }
  return fail(res, 404, "없는 주소입니다.");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const me = readToken(cookieOf(req, "tz"));
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url, me);

    /* 정적 파일 */
    if (url.pathname === "/favicon.ico") url.pathname = "/favicon.png";
    const rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC)) return fail(res, 403, "접근할 수 없습니다.");
    const buf = await fsp.readFile(file);
    send(res, 200, buf, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
  } catch (err) {
    if (err && err.code === "ENOENT") return fail(res, 404, "없는 주소입니다.");
    console.error("[오류]", err && err.message);
    if (!res.headersSent) fail(res, 500, "서버에서 처리하지 못했습니다.");
  }
});

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list || [])
      if (n.family === "IPv4" && !n.internal) return n.address;
  return null;
}

server.listen(PORT, "0.0.0.0", () => {
  const lan = lanAddress();
  console.log("");
  console.log("  테크젠 " + YEAR + "년 사외직무교육 계획 취합");
  console.log("  ────────────────────────────────────────────");
  console.log("  내 PC       http://localhost:" + PORT);
  if (lan) console.log("  사내망       http://" + lan + ":" + PORT + "   ← 직원들에게 알려줄 주소");
  console.log("  명단        " + ROSTER.length + "명 / " + ALL_TEAMS.length + "개 부서");
  console.log("  등록된 계획  " + PLANS.filter(p => p.year === YEAR).length + "건  (data/plans.json)");
  console.log("  취합 마감    " + ORGLIB.DEADLINE +
    (ORGLIB.isClosed() ? "  (마감됨)" : "  (D-" + ORGLIB.daysLeft() + ")"));
  console.log("");
  console.log("  종료하려면 Ctrl+C");
  console.log("");
});
server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  [오류] ${PORT} 포트를 이미 다른 프로그램이 쓰고 있습니다.`);
    console.error(`         다른 포트로 실행하세요:  PORT=3001 node server.js\n`);
  } else console.error("\n  [오류]", err.message, "\n");
  process.exit(1);
});
