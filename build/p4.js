
/* ---------- 서버 통신 ---------- */
async function apiCall(path, opts={}){
  let res;
  try{
    res = await fetch(path, {credentials:"same-origin",
      headers:{"Content-Type":"application/json"}, ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined});
  }catch(e){
    OFFLINE=true;
    throw new Error("서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인해 주세요.");
  }
  OFFLINE=false;
  let data={};
  try{ data = await res.json(); }catch(e){}
  if(!res.ok){
    if(res.status===401 && ME){ ME=null; render(); }
    throw new Error(data.error || "처리하지 못했습니다. 다시 시도해 주세요.");
  }
  return data;
}
function applyBootstrap(d){
  if(!d || !d.me){ ME=null; ROWS=[]; return; }
  ME=d.me; ORG=d.org||{}; TEAMS=d.allTeams||[]; SCOPE=d.scope||{teams:[],kind:"member"};
  IS_ADMIN=!!d.isAdmin; PEOPLE=d.roster||[]; BY_EMP=new Map(PEOPLE.map(p=>[p.emp,p]));
  DEADLINE=d.deadline||""; CLOSED=!!d.closed; CAN_WRITE=d.canWrite!==false;
  ROWS=d.plans||[];
}
async function boot(){
  try{ applyBootstrap(await apiCall("/api/bootstrap")); }
  catch(e){ toast(e.message,5000); }
  if(ME) await loadGuideMeta();
  BOOTED=true; render();
}
async function refresh(){
  try{ const d=await apiCall("/api/plans"); ROWS=d.plans||[]; render(); }
  catch(e){ /* 주기 갱신 실패는 조용히 넘어갑니다 */ }
}
/* 다른 사람이 등록한 내용을 주기적으로 받아옵니다.
   화면이 가려져 있거나 입력창이 열려 있으면 건너뜁니다. */
setInterval(()=>{
  if(!ME || document.hidden || $("#modalRoot").firstChild) return;
  refresh();
}, 20000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && ME) refresh(); });

/* ---------- 조회 대상 ---------- */
/* 서버가 조회 범위를 걸러서 내려주므로 그대로 씁니다. */
const visibleRows = () => ROWS;
function filtered(rows){
  let out=rows;
  if(SUB==="mine")     out=out.filter(r=>r.createdBy===ME.emp);
  if(SUB==="pending")  out=out.filter(r=>r.status==="pending");
  if(SUB==="approved") out=out.filter(r=>r.status==="approved");
  if(SUB==="rejected") out=out.filter(r=>r.status==="rejected");
  if(FTEAM) out=out.filter(r=>r.dept===FTEAM);
  if(FCAT)  out=out.filter(r=>r.category===FCAT);
  if(Q){ const q=Q.toLowerCase();
    out=out.filter(r=>[r.name,r.emp,r.course,r.org,r.place,r.dept].some(v=>String(v||"").toLowerCase().includes(q))); }
  return out.slice().sort((a,b)=>(a.dept||"").localeCompare(b.dept)||String(a.start||"").localeCompare(String(b.start||""))||(a.name||"").localeCompare(b.name));
}
const sum = (rows,f) => rows.reduce((a,r)=>a+(Number(r[f])||0),0);

/* 마감일까지 남은 날짜. 날짜만 비교하므로 마감 당일은 0. */
function daysToDeadline(){
  if(!DEADLINE) return null;
  const d=new Date(), t=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return Math.round((new Date(DEADLINE+"T00:00:00") - new Date(t+"T00:00:00"))/86400000);
}
const fmtDeadline = () => {
  if(!DEADLINE) return "";
  const d=new Date(DEADLINE+"T00:00:00");
  return `${d.getMonth()+1}월 ${d.getDate()}일(${"일월화수목금토"[d.getDay()]})`;
};

/* 같은 날이면 하루, 아니면 시작 ~ 종료(월-일만) */
function schedule(r){
  if(!r.start) return "-";
  if(r.start===r.end) return esc(r.start);
  return esc(r.start)+" ~ "+esc(String(r.end||"").slice(5));
}

/* ---------- 아이콘 ---------- */
const IC = {
  search:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  book:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z"/><path d="M9 7h6M9 11h6"/></svg>',
  down:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>',
  out:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17l5-5-5-5M20 12H9M11 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/></svg>',
  info:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></svg>',
  empty:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>',
  shield:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.2 19.5 6v6.3c0 4-3.1 7.2-7.5 8.5-4.4-1.3-7.5-4.5-7.5-8.5V6z"/></svg>',
  phone:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/></svg>',
  theme:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>',
};

/* ---------- 안내문 ---------- */
const GUIDE = [
  ["교육 범위","사외직무교육은 임직원의 직무역량 향상을 목적으로 하는 외부 교육을 의미합니다. 법정의무교육 등 필수교육은 이번 취합 대상에서 제외하며, 각 소속 팀에서 별도로 관리합니다."],
  ["팀장 사전 승인","모든 사외직무교육은 소속 팀장의 사전 승인을 받아야 합니다. 교육계획 등록만으로 교육 참여가 승인되는 것은 아닙니다."],
  ["신청 대상","관리직과 생산직을 포함한 전 임직원의 사외직무교육 계획을 본 시스템에 등록해 주시기 바랍니다."],
  ["사전 등록 원칙","본 시스템에 등록되지 않은 교육은 원칙적으로 참여가 제한됩니다. 차년도에 참여할 예정인 교육은 반드시 취합 기간 내 등록해 주시기 바랍니다.",true],
];
