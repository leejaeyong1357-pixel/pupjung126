/* 조직도와 권한 규칙 — 서버와 브라우저가 같은 파일을 씁니다.
   여기만 고치면 양쪽에 동시에 반영됩니다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ORGLIB = factory();
})(typeof self !== "undefined" ? self : this, function () {

  /* 실 -> 산하 팀 */
  const ORG = {
    "경영지원실": ["재경팀", "사업기획팀", "미래성장팀", "비즈니스솔루션팀"],
    "PT생산실":  ["PT생산1팀", "PT생산1팀_서산파견", "PT생산2팀", "PT생산관리팀"],
    "엔진생산실": ["엔진생산1팀", "엔진생산2팀", "엔진생산3팀", "엔진생산관리팀", "엔진보전팀"],
    "품질관리실": ["PT품질관리팀", "엔진품질관리1팀", "엔진품질관리2팀"],
  };

  /* 팀장이 없는 부서는 상위 조직이 결재를 대행합니다. */
  const APPROVER_FALLBACK = {
    "PT생산1팀_서산파견": "PT생산1팀",
    "엔진보전팀": "엔진생산실",
  };

  /* 전사 조회 + 집계 + 엑셀 */
  const ADMINS = ["82211489", "82210465"];   // 이재용(미래성장팀), 박동중(미래성장팀장)

  const SIL_OF = {};
  Object.entries(ORG).forEach(([sil, teams]) => {
    SIL_OF[sil] = sil;
    teams.forEach(t => (SIL_OF[t] = sil));
  });

  const isAdmin = me => !!me && ADMINS.includes(me.emp);

  /* 조회 범위 */
  function scopeOf(me, allTeams) {
    if (!me) return { teams: [], kind: "none" };
    if (isAdmin(me)) return { teams: allTeams.slice(), kind: "admin" };
    if (me.role === "실장") {
      const teams = [me.dept, ...(ORG[me.dept] || [])].filter(t => allTeams.includes(t));
      return { teams, kind: "sil" };
    }
    if (me.role === "팀장") {
      const extra = Object.keys(APPROVER_FALLBACK).filter(t => APPROVER_FALLBACK[t] === me.dept);
      return { teams: [me.dept, ...extra].filter(t => allTeams.includes(t)), kind: "lead" };
    }
    return { teams: [me.dept], kind: "member" };
  }

  /* 이 사람이 해당 부서 건을 결재할 수 있는가 */
  function canApprove(me, dept) {
    if (!me) return false;
    if (isAdmin(me)) return true;
    const target = APPROVER_FALLBACK[dept] || dept;
    if (me.role === "팀장") return target === me.dept || dept === me.dept;
    if (me.role === "실장") return SIL_OF[target] === me.dept || SIL_OF[dept] === me.dept;
    return false;
  }

  /* 등록한 본인과 관리자만 수정·삭제 */
  const canEditRow = (me, row) => !!me && (row.createdBy === me.emp || isAdmin(me));

  /* 등록 대상으로 지정할 수 있는 부서 */
  const writableTeams = (me, allTeams) => scopeOf(me, allTeams).teams;

  return { ORG, APPROVER_FALLBACK, ADMINS, SIL_OF, isAdmin, scopeOf, canApprove, canEditRow, writableTeams };
});
