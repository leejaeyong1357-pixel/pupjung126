<script>
/* ============================================================
   TECZEN · 2027년 사외직무교육 계획 취합
   ============================================================ */
const LOGO = "__LOGO__";
const YEAR = 2027;
const CATEGORIES = ["사외교육","사내교육"];
const STATUS = {
  pending:  {label:"승인 대기", cls:"c-wait"},
  approved: {label:"승인 확정", cls:"c-ok"},
  rejected: {label:"반려",     cls:"c-no"},
};

/* ---------- 서버에서 받는 값 ---------- */
let ORG={}, PEOPLE=[], BY_EMP=new Map(), TEAMS=[], SCOPE={teams:[],kind:"none"}, IS_ADMIN=false;
let DEADLINE="", CLOSED=false, CAN_WRITE=true;

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
   화면에 무엇을 보여줄지만 결정합니다.
   실제 허용 여부는 서버가 매 요청마다 다시 판단하며,
   각 행의 _edit / _appr 플래그도 서버가 붙여서 내려줍니다.        */
const scopeOf = () => SCOPE;
const isAdmin = () => IS_ADMIN;
const canApprove = row => !!row && row._appr === true;
const canEditRow = row => !!row && row._edit === true;

/* ---------- 상태 ---------- */
let ME=null, ROWS=[], BOOTED=false, OFFLINE=false;
let VIEW="team", SUB="all", Q="", FTEAM="", FCAT="";
