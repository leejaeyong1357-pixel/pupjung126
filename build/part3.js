<script>
/* ============================================================
   테크젠 법정의무교육 이수관리  —  단일 파일 오프라인 도구
   ============================================================ */
const RAW = __DATA__;
const META = __META__;
const DEADLINE = '2026-10-30', START = '2026-09-14';
const MGR = ['대표이사','상무','실장','팀장','책임매니저','매니저'];
const LEAD = ['조장','반장','주임'];
const LS = 'teczen_edu_v1';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = p => p.up+'§'+p.dept;
const jobOf = pos => MGR.includes(pos) ? 'mgr' : (LEAD.includes(pos) ? 'lead' : 'tech');
function toast(m,ms=2200){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),ms);}

/* ---------- state ---------- */
let ST = {done:{}, owners:{}, extra:{}, added:[], hist:[], master:[], rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1,masterOnly:0}, theme:''};
function load(){
  try{
    const r=localStorage.getItem(LS); if(!r) return;
    const saved=JSON.parse(r);
    const rules=Object.assign({}, ST.rules, saved.rules||{});   // 구버전 저장본에 없는 키는 기본값 유지
    ST=Object.assign(ST, saved, {rules});
    if(!ST.rules.mgr && !ST.rules.lead){ ST.rules.mgr=1; ST.rules.lead=1; }  // 둘 다 꺼진 상태는 복구
  }catch(e){}
}
function save(){ try{localStorage.setItem(LS,JSON.stringify(ST));}catch(e){toast('저장 실패: 브라우저 저장소를 사용할 수 없습니다');} }
load();

/* ---------- people ---------- */
let PEOPLE = [];
function build(){
  PEOPLE = RAW.concat(ST.added||[]).map(p=>{
    const o = ST.done[p.emp]||{};
    return {...p, h: o.h!==undefined?o.h:p.h, d: o.d!==undefined?o.d:p.d, job: jobOf(p.pos)};
  });
}
build();
const statOf = p => (p.h&&p.d) ? 'done' : (!p.h&&!p.d) ? 'both' : (!p.h ? 'h' : 'd');
const STAT_LABEL = {done:['이수 완료','p-ok'], both:['둘 다 미이수','p-bad'], h:['성희롱만 미이수','p-warn'], d:['장애인만 미이수','p-warn']};

/* ---------- filters ---------- */
let F = {stat:'notdone', up:'', dept:'', pos:'', job:'', q:''};
let SORT = {k:'up', dir:1};
function match(p){
  const s = statOf(p);
  if(F.stat==='notdone'){ if(s==='done') return false; }
  else if(F.stat!=='all' && s!==F.stat) return false;
  if(F.up && p.up!==F.up) return false;
  if(F.dept && p.dept!==F.dept) return false;
  if(F.pos && p.pos!==F.pos) return false;
  if(F.job && p.job!==F.job) return false;
  if(F.q){ const q=F.q.toLowerCase();
    if(!(p.name.toLowerCase().includes(q)||String(p.emp).includes(q)||p.email.toLowerCase().includes(q)||p.dept.toLowerCase().includes(q))) return false; }
  return true;
}
function filtered(){
  const r = PEOPLE.filter(match);
  const k=SORT.k, d=SORT.dir;
  r.sort((a,b)=>{
    let x = k==='stat' ? statOf(a) : a[k], y = k==='stat' ? statOf(b) : b[k];
    if(k==='h'||k==='d'){x=a[k];y=b[k];}
    if(x===y) return a.up.localeCompare(b.up)||a.dept.localeCompare(b.dept)||a.name.localeCompare(b.name);
    return (x>y?1:-1)*d;
  });
  return r;
}
let SEL = new Set();
function targets(){ const f=filtered(); const s=f.filter(p=>SEL.has(p.emp)); return s.length?s:f; }

/* ---------- KPI ---------- */
function renderKpi(){
  const tot=PEOPLE.length;
  const hd=PEOPLE.filter(p=>p.h).length, dd=PEOPLE.filter(p=>p.d).length;
  const allDone=PEOPLE.filter(p=>p.h&&p.d).length;
  const both=PEOPLE.filter(p=>!p.h&&!p.d).length;
  const days=Math.ceil((new Date(DEADLINE)-new Date())/864e5);
  $('#dday').textContent = days>0?`마감까지 D-${days} (${DEADLINE})`:`마감 경과 (${DEADLINE})`;
  $('#asof').textContent = `대상 ${tot}명 · 교육기간 ${START} ~ ${DEADLINE} · 최종반영 ${ST.hist.length?ST.hist[0].at:'없음'}`;
  const k=(lab,val,note,pct,ok)=>`<div class="kpi"><div class="lab">${lab}</div><div class="val">${val}</div><div class="note">${note}</div>
    ${pct!=null?`<div class="bar ${ok?'ok':''}"><i style="width:${pct}%"></i></div>`:''}</div>`;
  $('#kpis').innerHTML =
    k('전체 이수 완료', `${allDone}<span style="font-size:14px;color:var(--ink2)"> / ${tot}</span>`, `2과목 모두 완료 · 잔여 ${tot-allDone}명`, (allDone/tot*100).toFixed(0), 1)
  + k('성희롱 예방교육', `${(hd/tot*100).toFixed(1)}%`, `이수 ${hd}명 · 미이수 ${tot-hd}명`, hd/tot*100)
  + k('장애인 인식개선', `${(dd/tot*100).toFixed(1)}%`, `이수 ${dd}명 · 미이수 ${tot-dd}명`, dd/tot*100)
  + k('둘 다 미이수', both, `최우선 독려 대상`, null)
  + k('남은 기간', days>0?days+'일':'종료', `${START} ~ ${DEADLINE}`, null);
}

/* ---------- main table ---------- */
function renderTable(){
  const rows = filtered();
  $('#cntShown').textContent = `${rows.length}명` + (SEL.size?` (선택 ${SEL.size})`:'');
  $('#emptyMsg').hidden = rows.length>0;
  const yn = v => v ? '<span class="pill p-ok">이수</span>' : '<span class="pill p-bad">미이수</span>';
  $('#tbody').innerHTML = rows.map((p,i)=>{
    const jt = p.job==='mgr'?'<span class="pill tag-mgr" style="margin-left:4px">관리</span>':p.job==='lead'?'<span class="pill tag-lead" style="margin-left:4px">직책</span>':'';
    return `<tr><td><input type="checkbox" data-e="${p.emp}" ${SEL.has(p.emp)?'checked':''}></td>
      <td class="num">${i+1}</td>
      <td><b>${esc(p.name)}</b></td><td class="num">${esc(p.emp)}</td>
      <td>${esc(p.pos)}${jt}</td><td>${esc(p.up)}</td><td>${esc(p.dept)}</td>
      <td class="num">${esc(p.email)}</td><td class="num">${esc(p.tel)}</td>
      <td>${yn(p.h)}</td><td>${yn(p.d)}</td></tr>`;
  }).join('');
  $('#chkAll').checked = rows.length>0 && rows.every(p=>SEL.has(p.emp));
}
function fillSelects(){
  const u=[...new Set(PEOPLE.map(p=>p.up))].sort();
  const d=[...new Set(PEOPLE.filter(p=>!F.up||p.up===F.up).map(p=>p.dept))].sort();
  const s=[...new Set(PEOPLE.map(p=>p.pos))].sort((a,b)=>MGR.concat(LEAD,['기술사원']).indexOf(a)-MGR.concat(LEAD,['기술사원']).indexOf(b));
  const opt=(arr,v)=>`<option value="">전체</option>`+arr.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  $('#fUp').innerHTML=opt(u,F.up); $('#fDept').innerHTML=opt(d,F.dept); $('#fPos').innerHTML=opt(s,F.pos);
}

/* ---------- dept aggregation ---------- */
function agg(keyFn){
  const m=new Map();
  PEOPLE.forEach(p=>{const k=keyFn(p); if(!m.has(k)) m.set(k,{k,up:p.up,dept:p.dept,list:[]}); m.get(k).list.push(p);});
  return [...m.values()].map(g=>{
    const t=g.list.length, h=g.list.filter(p=>!p.h).length, d=g.list.filter(p=>!p.d).length;
    const both=g.list.filter(p=>!p.h&&!p.d).length, done=g.list.filter(p=>p.h&&p.d).length;
    return {...g,tot:t,hNo:h,dNo:d,both,done,rate:done/t*100};
  }).sort((a,b)=>a.rate-b.rate||b.tot-a.tot);
}
function renderDept(){
  const ups=agg(p=>p.up);
  $('#deptUp').innerHTML = ups.map(g=>`<div class="deptbar">
    <div class="nm" title="${esc(g.up)}">${esc(g.up)}</div>
    <div class="tr"><i style="width:${g.rate.toFixed(1)}%"></i></div>
    <div class="pc">${g.done}/${g.tot} · ${g.rate.toFixed(0)}%</div></div>`).join('');
  const only=$('#onlyRemain').checked;
  const ds=agg(key).filter(g=>!only||g.done<g.tot);
  $('#deptBody').innerHTML = ds.map(g=>{
    const r=rcptOf(g.k);
    const ow=ownerOf(g.up,g.dept);
    return `<tr style="cursor:pointer" data-up="${esc(g.up)}" data-dept="${esc(g.dept)}">
      <td>${esc(g.up)}</td><td><b>${esc(g.dept)}</b></td><td class="num">${g.tot}</td>
      <td class="num">${g.hNo?`<span class="pill p-bad">${g.hNo}</span>`:'<span class="pill p-ok">0</span>'}</td>
      <td class="num">${g.dNo?`<span class="pill p-bad">${g.dNo}</span>`:'<span class="pill p-ok">0</span>'}</td>
      <td class="num">${g.both||'-'}</td><td class="num">${g.done}</td>
      <td class="num">${g.rate.toFixed(0)}%</td>
      <td>${ow.name?esc(ow.name):'<span class="pill p-mute">미지정</span>'}</td>
      <td>${r.to.length?r.to.map(x=>esc(x.name)+'('+esc(x.pos)+')').join(', ')+(r.via?` <span class="pill p-warn">${esc(r.via)}</span>`:''):'<span class="pill p-warn">수신자 없음</span>'}</td></tr>`;
  }).join('');
  $$('#deptBody tr').forEach(tr=>tr.onclick=()=>{
    F={stat:'notdone',up:tr.dataset.up,dept:tr.dataset.dept,pos:'',job:'',q:''};
    fillSelects(); $('#fStat').value='notdone'; go('main'); renderTable();
  });
}

/* ---------- owners & recipients ---------- */
/* 서무 매핑 — 회사 「서무」 시트 기준.
   조직 이름은 데이터상 상위부서일 수도, 부서일 수도 있어서(예: PT생산1팀은 둘 다,
   재경팀은 테크젠 아래 부서) 이름 하나로 잡고 부서 → 상위부서 순으로 찾습니다. */
const SEED_OWNERS={
  '재경팀':        {name:'김혜원', email:'82211616@teczen.kr'},
  '사업기획팀':     {name:'이다영', email:'82211602@teczen.kr'},
  '미래성장팀':     {name:'최선화', email:'82211253@teczen.kr'},
  '경영지원실':     {name:'양아현', email:'82211580@teczen.kr'},
  '비즈니스솔루션팀': {name:'양아현', email:'82211580@teczen.kr'},
  'PT생산1팀':     {name:'정은진', email:'82211601@teczen.kr'},
  'PT생산실':      {name:'양선미', email:'82210701@teczen.kr'},
  'PT생산2팀':     {name:'양선미', email:'82210701@teczen.kr'},
  'PT생산관리팀':   {name:'유현주', email:'82211603@teczen.kr'},
  '품질관리실':     {name:'유현주', email:'82211603@teczen.kr'},
  'PT품질관리팀':   {name:'유현주', email:'82211603@teczen.kr'},
  // 이한솔·이새롬은 이미 교육을 이수해 미이수자 명단에 없어 인사 명부에서 별도 확인했습니다.
  // 서무 이한솔(82251001)은 명단의 기술사원 이한솔(82210992)과 다른 사람입니다.
  '엔진생산실':     {name:'이새롬', email:'82251000@teczen.kr'},
  '엔진생산1팀':    {name:'이새롬', email:'82251000@teczen.kr'},
  '엔진생산관리팀':  {name:'이새롬', email:'82251000@teczen.kr'},
  '엔진품질관리1팀': {name:'이새롬', email:'82251000@teczen.kr'},
  '엔진생산3팀':    {name:'이한솔', email:'82251001@teczen.kr'},
  '엔진품질관리2팀': {name:'이한솔', email:'82251001@teczen.kr'},
  '엔진생산2팀':    {name:'황나영', email:'82291025@teczen.kr'},
  // 노동조합·대표이사는 서무 시트에 없는 조직이라 관리자가 직접 챙깁니다.
  '노동조합':       {name:'이재용', email:'jason@teczen.kr'},
  '테크젠':        {name:'이재용', email:'jason@teczen.kr'},
};
const ORG_NAMES = () => {
  const set=new Set(Object.keys(SEED_OWNERS));
  Object.keys(ST.owners||{}).forEach(k=>set.add(k));
  PEOPLE.forEach(p=>set.add(p.up));
  return [...set];
};
function ownerCands(up){
  const a=PEOPLE.filter(p=>p.dept===up && p.job==='mgr');
  const b=PEOPLE.filter(p=>p.up===up && p.job==='mgr' && !a.includes(p));
  const rank=p=>MGR.indexOf(p.pos);
  return a.concat(b).sort((x,y)=>rank(y)-rank(x)||x.name.localeCompare(y.name));
}
/* 부서 이름으로 먼저 찾고, 없으면 상위부서 이름으로 찾습니다.
   사용자가 직접 지정한 값(ST.owners)이 회사 시트 기본값(SEED_OWNERS)보다 우선합니다. */
function ownerAt(org){
  if(!org) return null;
  const m=ST.owners[org];
  if(m && (m.name||m.email)) return {...m, org, auto:false};
  const sd=SEED_OWNERS[org];
  if(sd) return {...sd, org, auto:true, seed:true};
  return null;
}
function ownerOf(up, dept){
  return ownerAt(dept) || ownerAt(up) || {name:'',email:'',org:up,auto:true,none:true};
}
/* 수신자 마스터(팀장·조장·반장 명부)가 등록돼 있으면 항상 그쪽을 먼저 씁니다.
   미이수자 명단에서 역산하는 방식은 직책자가 교육을 이수하는 순간 수신자가
   사라지므로, 마스터가 있으면 그것이 정답입니다. */
const master = () => ST.master||[];
function masterLead(up){                       // 상위부서의 팀장
  return master().find(m=>m.up===up && (!m.dept||m.dept===up) && m.pos==='팀장')
      || master().find(m=>m.up===up && m.pos==='팀장') || null;
}
function masterFieldOf(up,dept){               // 부서의 조장·반장·주임
  return master().filter(m=>m.up===up && m.dept===dept && LEAD.includes(m.pos));
}
/* 해당 팀장 = ⓪ 마스터 ① 같은 부서의 팀장 ② 상위부서명과 같은 부서(팀 사무실)의 팀장.
   그 위(실/전사) 팀장을 끌어오면 무관한 사람에게 가므로 여기서 멈춥니다. */
function teamLeadOf(p){
  return masterLead(p.up)
      || PEOPLE.find(x=>x.dept===p.dept && x.pos==='팀장' && String(x.emp)!==String(p.emp))
      || PEOPLE.find(x=>x.dept===p.up  && x.pos==='팀장')
      || null;
}
/* 이 사람의 서무가 어느 조직 행에서 결정되는지 */
function ownerOrgOf(p){
  if(ownerAt(p.dept)) return p.dept;
  if(ownerAt(p.up))   return p.up;
  return p.up;
}
const ADMIN={name:'이재용',pos:'관리자',email:'jason@teczen.kr',dept:'미래성장팀'};
function rcptOf(k){
  const [up,dept]=k.split('§');
  const R=ST.rules;
  const mem=PEOPLE.filter(p=>key(p)===k);
  const sample=mem[0]||{dept,up};
  // 마스터 우선 → 명단 추론 → 수동 추가 순으로 모으고 중복 제거
  let to=[];
  const seenTo=new Set();
  const push=x=>{ const id=(x.email||'').toLowerCase(); if(!id||seenTo.has(id))return; seenTo.add(id); to.push(x); };
  masterFieldOf(up,dept).forEach(m=>push({...m,job:jobOf(m.pos),fromMaster:true}));
  if(!R.masterOnly) mem.filter(p=> p.job==='lead' || (R.tech&&p.job==='tech')).forEach(push);
  (ST.extra[k]||[]).forEach(x=>push({...x,job:jobOf(x.pos),extra:true}));
  let via='';
  if(!to.length){
    const tl=teamLeadOf(sample);
    const mgrInUp=PEOPLE.filter(p=>p.up===up&&p.job==='mgr')
      .sort((a,b)=>MGR.indexOf(a.pos)-MGR.indexOf(b.pos))[0];
    const o=ownerOf(up,dept);
    if(tl){ to=[tl]; via='팀장 대체'; }
    else if(mgrInUp){ to=[mgrInUp]; via='관리직 대체'; }
    else if(o.email){ to=[{name:o.name,email:o.email,pos:'담당(서무)'}]; via='담당 서무 대체'; }
    else { to=[ADMIN]; via='관리자 대체'; }
  }
  const cc=[];
  if(R.teamcc){ const tl=teamLeadOf(sample); if(tl && !to.some(x=>x.email===tl.email)) cc.push(tl); }
  if(R.ownercc){ const o=ownerOf(up,dept); if(o.email) cc.push({name:o.name,email:o.email,pos:'담당(서무)'}); }
  const seen=new Set(to.map(x=>x.email));
  const ccOut=[];
  cc.forEach(c=>{ if(c.email && !seen.has(c.email)){ seen.add(c.email); ccOut.push(c); } });
  const needsFix = via==='담당 서무 대체' || via==='관리자 대체';
  return {to, cc:ccOut, up, dept, via, needsFix};
}
function renderMap(){
  const R=ST.rules;
  $('#rMgr').checked=!!R.mgr; $('#rLead').checked=!!R.lead; $('#rTech').checked=!!R.tech;
  $('#rTeamCC').checked=!!R.teamcc; $('#rOwnerCC').checked=!!R.ownercc;
  // 서무는 팀 단위로 정해집니다. 조직 이름이 데이터상 부서인 경우(재경팀 등)도 있어서
  // 상위부서 목록이 아니라 "조직 이름" 목록으로 행을 만듭니다.
  const cnt=new Map();                       // 조직 -> 이 서무가 담당하는 미이수 인원
  PEOPLE.filter(p=>!p.h||!p.d).forEach(p=>{ const o=ownerOrgOf(p); cnt.set(o,(cnt.get(o)||0)+1); });
  const orgs=ORG_NAMES().filter(o=>cnt.get(o)).sort((a,b)=>(cnt.get(b)-cnt.get(a))||a.localeCompare(b));
  const noOwner=[...cnt.entries()].filter(([o])=>!ownerAt(o)).reduce((a,[,n])=>a+n,0);
  const noMail=orgs.filter(o=>{const w=ownerAt(o); return w&&w.name&&!w.email;});
  $('#ownerBody').innerHTML =
    (noMail.length?`<tr><td colspan="5" style="padding:0">
      <div class="warnbox" style="margin:8px 0;border-radius:6px"><b>⚠ 이메일 확인 필요 ${noMail.length}곳</b> —
      ${noMail.map(o=>`${esc(o)}(${esc(ownerAt(o).name)})`).join(', ')}<br>
      해당 서무가 이미 교육을 이수해 명단에 없어 이메일을 찾지 못했습니다. 직접 입력해 주세요.</div></td></tr>`:'')
    + orgs.map(org=>{
    const w=ownerAt(org)||{name:'',email:''}, st=ST.owners[org]||{}, cands=ownerCands(org);
    const cur = st.emp || '';
    const opts = cands.map(c=>`<option value="${esc(c.emp)}" ${String(c.emp)===String(cur)?'selected':''}>${esc(c.name)} · ${esc(c.pos)} · ${esc(c.dept)}</option>`).join('');
    const manual = st.emp==='_manual' || (!st.emp && w.seed);
    const warn = w.name && !w.email;
    return `<tr${warn?' style="background:var(--warn-soft)"':''}>
      <td><b>${esc(org)}</b></td><td class="num">${cnt.get(org)}</td>
      <td><input data-ow="${esc(org)}" data-f="name" value="${esc(st.name||w.name||'')}" placeholder="이름" style="width:90px">
        <select data-ow="${esc(org)}" data-f="emp" style="width:170px;margin-top:4px">
          <option value="">— 직접입력 —</option>${opts}</select></td>
      <td><input data-ow="${esc(org)}" data-f="email" value="${esc(st.email||w.email||'')}" placeholder="이메일" style="width:230px"></td>
      <td class="hint">${warn?'<b style="color:var(--warn)">이메일 없음</b>':(st.name||st.email?'직접 지정':(w.seed?'서무 시트':'—'))}</td></tr>`;
  }).join('')
  + (noOwner?`<tr><td colspan="5" style="padding:0"><div class="warnbox" style="margin:8px 0;border-radius:6px">
      <b>담당 서무가 지정되지 않은 인원 ${noOwner}명</b> — ${[...cnt.entries()].filter(([o])=>!ownerAt(o)).map(([o,n])=>`${esc(o)} ${n}명`).join(', ')}
      </div></td></tr>`:'');
  $$('#ownerBody select,#ownerBody input').forEach(i=>i.onchange=()=>{
    const org=i.dataset.ow, w=ownerAt(org)||{name:'',email:''};
    const cur=ST.owners[org]||{name:w.name||'',email:w.email||''};
    if(i.dataset.f==='emp'){
      const v=i.value;
      if(v){ const c=PEOPLE.find(p=>String(p.emp)===v); ST.owners[org]={emp:v,name:c.name,email:c.email}; }
      else { ST.owners[org]={...cur,emp:'_manual'}; }
    } else { ST.owners[org]={...cur, [i.dataset.f]:i.value.trim()}; }
    save(); renderMap(); renderDept(); fillMailOwner();
  });
  // 상위부서 단위로 접었다 펴는 구조: 팀장(관리직 참조) + 부서별 조장·반장
  const only=$('#onlyNoRcpt').checked;
  const ups2=[...new Set(PEOPLE.filter(p=>!p.h||!p.d).map(p=>p.up))].sort();
  const chip=(x,extraKey)=>`<span class="chip"><b>${esc(x.name)}</b> ${esc(x.pos)}
    <span class="hint">${esc(x.email)}</span>
    ${x.fromMaster?'<span class="pill p-ok" style="font-size:10px">마스터</span>':''}
    ${x.extra?`<span class="x" data-del="${esc(extraKey)}" data-em="${esc(x.email)}">✕</span>`:''}</span>`;
  $('#rcptBox').innerHTML = ups2.map(up=>{
    const gs=agg(key).filter(g=>g.up===up && g.done<g.tot);
    const rs=gs.map(g=>({g,r:rcptOf(g.k)}));
    const fix=rs.filter(x=>x.r.needsFix).length;
    if(only && !fix) return '';
    const tl=teamLeadOf({up,dept:up});
    const ow=ownerOf(up,up);
    const mgrCnt=PEOPLE.filter(p=>p.up===up&&p.job==='mgr'&&(!p.h||!p.d)).length;
    const body = rs.map(({g,r})=>`<div style="padding:7px 0;border-top:1px solid var(--line2)">
        <div class="row"><b style="min-width:190px">${esc(g.dept)}</b>
          <span class="pill p-bad">미이수 ${g.tot-g.done}</span>
          ${r.needsFix?`<span class="pill p-warn">${esc(r.via)} — 보완 필요</span>`:(r.via?`<span class="pill p-mute">${esc(r.via)}</span>`:'')}</div>
        <div class="chips" style="margin-top:5px">${r.to.map(x=>chip(x,g.k)).join('')}</div>
        <div class="row" style="margin-top:5px">
          <input placeholder="이름" data-k="${esc(g.k)}" data-f="name" style="width:80px">
          <input placeholder="직위" data-k="${esc(g.k)}" data-f="pos" style="width:80px">
          <input placeholder="이메일" data-k="${esc(g.k)}" data-f="email" style="width:200px">
          <button class="btn sec mini" data-add="${esc(g.k)}">＋ 추가</button></div>
      </div>`).join('');
    return `<details class="acc"${fix?' open':''}><summary>${esc(up)}
      <span class="pill p-mute">부서 ${gs.length}</span>
      ${mgrCnt?`<span class="pill tag-mgr">관리직 ${mgrCnt}</span>`:''}
      ${fix?`<span class="pill p-warn">보완 필요 ${fix}</span>`:'<span class="pill p-ok">정상</span>'}</summary>
      <div class="body">
        <div class="row" style="padding-bottom:8px">
          <span class="hint" style="min-width:190px;font-weight:700">Ⓐ 관리직 참조 — 팀장</span>
          ${tl?chip(tl):'<span class="pill p-warn">팀장 미등록 — 마스터에 넣어주세요</span>'}
          ${ow.email?`<span class="chip" style="opacity:.75">담당(서무) ${esc(ow.name)} <span class="hint">${esc(ow.email)}</span></span>`:''}
        </div>
        <div class="hint" style="font-weight:700;padding-top:4px;border-top:1px solid var(--line2)">Ⓑ 현장 수신자 — 부서별 조장·반장</div>
        ${body||'<div class="hint" style="padding:8px 0">미이수 부서 없음</div>'}
      </div></details>`;
  }).join('') || '<div class="empty">보완이 필요한 곳이 없습니다 🎉</div>';
  $$('#rcptBox [data-add]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.add, g=[...$$(`#rcptBox [data-k="${CSS.escape(k)}"]`)];
    const v={}; g.forEach(i=>v[i.dataset.f]=i.value.trim());
    if(!v.email){toast('이메일을 입력하세요');return;}
    ST.extra[k]=ST.extra[k]||[]; ST.extra[k].push({name:v.name||v.email,pos:v.pos||'직책자',email:v.email});
    save(); renderMap(); renderDept(); toast('수신자 추가됨');
  });
  $$('#rcptBox [data-del]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.del; ST.extra[k]=(ST.extra[k]||[]).filter(x=>x.email!==b.dataset.em); save(); renderMap(); toast('삭제됨');
  });
}
