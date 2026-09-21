<script>
/* ============================================================
   TECZEN · 2027년 사외직무교육 계획 취합
   ============================================================ */
const LOGO = "__LOGO__";
const YEAR = 2027;
const CATEGORIES = ["직무전문","리더십","직무자격","어학","기타"];
const STATUS = {
  pending:  {label:"승인 대기", cls:"c-wait"},
  approved: {label:"승인 확정", cls:"c-ok"},
  rejected: {label:"반려",     cls:"c-no"},
};

/* ---------- 조직 ---------- */
const ORG = DATA.ORG;                        // 실 -> [팀]
const TEAM_OF_SIL = {};                      // 팀 -> 실
Object.entries(ORG).forEach(([sil,teams])=>{ TEAM_OF_SIL[sil]=sil; teams.forEach(t=>TEAM_OF_SIL[t]=sil); });
const PEOPLE = DATA.R.map(([emp,name,dept,position,grade,role])=>({emp,name,dept,position,grade,role}));
const BY_EMP = new Map(PEOPLE.map(p=>[p.emp,p]));
const TEAMS = [...new Set(PEOPLE.map(p=>p.dept))].sort();
const LEAD_OF = {};                          // 부서 -> 팀장/실장
PEOPLE.forEach(p=>{ if(p.role==="팀장"||p.role==="실장") LEAD_OF[p.dept]=p; });

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const won = n => (Number(n)||0).toLocaleString("ko-KR");
const uid = () => "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function toast(msg,ms=2600){const t=$("#toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),ms);}

/* 교육일수: 시작·종료일 포함 */
function daysBetween(a,b){
  if(!a||!b) return 0;
  const d=(new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000;
  return d<0?0:Math.round(d)+1;
}

/* ---------- 권한 ----------
   팀원  : 본인 소속 팀
   팀장  : 본인 팀 + 승인/반려
   실장  : 산하 전체 팀 (승인/반려)
   관리자: 전 조직 + 집계 + 엑셀                                   */
function scopeOf(me){
  if(!me) return {teams:[],kind:"none"};
  if(DATA.ADMINS.includes(me.emp)) return {teams:TEAMS.slice(),kind:"admin"};
  if(me.role==="실장"){
    const sil=me.dept;
    return {teams:[sil,...(ORG[sil]||[])].filter(t=>TEAMS.includes(t)),kind:"sil",sil};
  }
  if(me.role==="팀장"){
    const extra=Object.entries(DATA.FB).filter(([,to])=>to===me.dept).map(([t])=>t);
    return {teams:[me.dept,...extra],kind:"lead"};
  }
  return {teams:[me.dept],kind:"member"};
}
const isAdmin = me => DATA.ADMINS.includes(me.emp);
/* 이 사람이 해당 부서 건을 결재할 수 있는가 */
function canApprove(me,dept){
  if(!me) return false;
  if(isAdmin(me)) return true;
  const target = DATA.FB[dept] || dept;
  if(me.role==="팀장" && (target===me.dept || dept===me.dept)) return true;
  if(me.role==="실장" && (TEAM_OF_SIL[target]===me.dept || TEAM_OF_SIL[dept]===me.dept)) return true;
  return false;
}
const canEditRow = (me,r) => !!me && (r.createdBy===me.emp || isAdmin(me));

/* ---------- 상태 ---------- */
const LS="teczen_edu_plan_2027";
let ME=null, DB=null, DL=null, ROWS=[], READY=false, DBOK=false;
let VIEW="team", SUB="all", Q="", FTEAM="", FCAT="";

function loadMe(){ try{const r=localStorage.getItem(LS); if(r){const e=BY_EMP.get(JSON.parse(r).emp); if(e) return e;}}catch(e){} return null; }
function saveMe(p){ try{ p?localStorage.setItem(LS,JSON.stringify({emp:p.emp})):localStorage.removeItem(LS);}catch(e){} }
ME=loadMe();
