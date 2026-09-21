
/* ---------- db ---------- */
async function initDb(){
  try{ DB = await claude.use("db"); }catch(e){ DB=null; }
  try{ DL = await claude.use("downloads"); }catch(e){ DL=null; }
  if(!DB){ READY=true; render(); return; }
  DB.collection("plans").onSnapshot(
    snap=>{ ROWS = snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.year===YEAR);
            DBOK=true; READY=true; render(); },
    err=>{ DBOK=false; READY=true; render();
           toast(err.code==="revoked" ? "접근 권한이 해제되었습니다. 새로고침해 주세요."
                                      : "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",5000); }
  );
}
async function saveRow(row){
  if(!DB){ toast("저장 공간에 연결되지 않아 등록할 수 없습니다."); return false; }
  try{ await DB.doc("plans/"+row.id).set(row); return true; }
  catch(e){
    toast(e.code==="quota_exceeded" ? "저장 한도가 가득 찼습니다. 관리자에게 알려주세요."
        : e.code==="invalid_argument" ? "이 계정에는 등록 권한이 없습니다."
        : "저장하지 못했습니다. 다시 시도해 주세요.",4500);
    return false;
  }
}
async function patchRow(id,patch){
  if(!DB) return false;
  try{ await DB.doc("plans/"+id).update(patch); return true; }
  catch(e){ toast("변경하지 못했습니다. 다시 시도해 주세요.",4000); return false; }
}
async function removeRow(id){
  if(!DB) return false;
  try{ await DB.doc("plans/"+id).delete(); return true; }
  catch(e){ toast("삭제하지 못했습니다. 다시 시도해 주세요.",4000); return false; }
}

/* ---------- 조회 대상 ---------- */
function visibleRows(){
  const sc=scopeOf(ME), set=new Set(sc.teams);
  return ROWS.filter(r=>set.has(r.dept));
}
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
  theme:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>',
};

/* ---------- 안내문 ---------- */
const GUIDE = [
  ["교육 범위","사외직무교육은 임직원의 직무역량 향상을 목적으로 하는 외부 교육을 의미합니다. 법정의무교육 등 필수교육은 이번 취합 대상에서 제외하며, 각 소속 팀에서 별도로 관리합니다."],
  ["팀장 사전 승인","모든 사외직무교육은 소속 팀장의 사전 승인을 받아야 합니다. 교육계획 등록만으로 교육 참여가 승인되는 것은 아닙니다."],
  ["신청 대상","관리직과 생산직을 포함한 전 임직원의 사외직무교육 계획을 본 시스템에 등록해 주시기 바랍니다."],
  ["사전 등록 원칙","본 시스템에 등록되지 않은 교육은 원칙적으로 참여가 제한됩니다. 차년도에 참여할 예정인 교육은 반드시 취합 기간 내 등록해 주시기 바랍니다.",true],
];
