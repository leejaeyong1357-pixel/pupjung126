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
let ST = {done:{}, owners:{}, extra:{}, added:[], hist:[], rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1}, theme:''};
function load(){ try{const r=localStorage.getItem(LS); if(r) ST=Object.assign(ST,JSON.parse(r));}catch(e){} }
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
    const ow=ownerOf(g.up);
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
const SEED_OWNER={'PT생산1팀':'82211601'};   // 사용자 확인분: PT생산1팀 담당 정은진
function ownerCands(up){
  // 서무는 보통 상위부서와 같은 이름의 조직(팀 사무실)에 소속된 관리직입니다.
  const a=PEOPLE.filter(p=>p.dept===up && p.job==='mgr');
  const b=PEOPLE.filter(p=>p.up===up && p.job==='mgr' && !a.includes(p));
  const rank=p=>MGR.indexOf(p.pos);
  return a.concat(b).sort((x,y)=>rank(y)-rank(x)||x.name.localeCompare(y.name));
}
function ownerOf(up){
  const o=ST.owners[up];
  if(o&&(o.name||o.email)) return {...o, auto:false};
  const seed=SEED_OWNER[up] && PEOPLE.find(p=>String(p.emp)===SEED_OWNER[up]);
  const c=seed||ownerCands(up).find(p=>['매니저','책임매니저'].includes(p.pos));
  return c?{emp:String(c.emp),name:c.name,email:c.email,auto:true}:{name:'',email:'',auto:true};
}
/* 해당 팀장 = ① 같은 부서의 팀장 ② 상위부서명과 같은 부서(팀 사무실)의 팀장.
   그 위(실/전사) 팀장을 끌어오면 무관한 사람에게 가므로 여기서 멈춥니다. */
function teamLeadOf(p){
  return PEOPLE.find(x=>x.dept===p.dept && x.pos==='팀장' && String(x.emp)!==String(p.emp))
      || PEOPLE.find(x=>x.dept===p.up  && x.pos==='팀장')
      || null;
}
/* Ⓑ 부서 독려메일의 받는사람: 그 부서의 조장·반장·주임.
   없으면 팀장, 팀장도 없으면 담당 서무로 대체합니다. */
function rcptOf(k){
  const [up,dept]=k.split('§');
  const R=ST.rules;
  const mem=PEOPLE.filter(p=>key(p)===k);
  const sample=mem[0]||{dept,up};
  let to=mem.filter(p=> p.job==='lead' || (R.tech&&p.job==='tech'));
  (ST.extra[k]||[]).forEach(x=>to.push({...x,job:jobOf(x.pos),extra:true}));
  let via='';
  if(!to.length){
    const tl=teamLeadOf(sample);
    if(tl){ to=[tl]; via='팀장 대체'; }
    else { const o=ownerOf(up); if(o.email){ to=[{name:o.name,email:o.email,pos:'담당(서무)'}]; via='담당 서무 대체'; } }
  }
  const cc=[];
  if(R.teamcc){ const tl=teamLeadOf(sample); if(tl && !to.some(x=>x.email===tl.email)) cc.push(tl); }
  if(R.ownercc){ const o=ownerOf(up); if(o.email) cc.push({name:o.name,email:o.email,pos:'담당(서무)'}); }
  const seen=new Set(to.map(x=>x.email));
  const ccOut=[];
  cc.forEach(c=>{ if(c.email && !seen.has(c.email)){ seen.add(c.email); ccOut.push(c); } });
  return {to, cc:ccOut, up, dept, via};
}
function renderMap(){
  const R=ST.rules;
  $('#rMgr').checked=!!R.mgr; $('#rLead').checked=!!R.lead; $('#rTech').checked=!!R.tech;
  $('#rTeamCC').checked=!!R.teamcc; $('#rOwnerCC').checked=!!R.ownercc;
  const ups=agg(p=>p.up);
  $('#ownerBody').innerHTML = ups.sort((a,b)=>a.up.localeCompare(b.up)).map(g=>{
    const o=ownerOf(g.up), st=ST.owners[g.up]||{}, cands=ownerCands(g.up);
    const cur = st.emp || (o.auto?o.emp:'') || '';
    const opts = cands.map(c=>`<option value="${esc(c.emp)}" ${String(c.emp)===String(cur)?'selected':''}>${esc(c.name)} · ${esc(c.pos)} · ${esc(c.dept)}</option>`).join('');
    const manual = st.emp==='_manual';
    return `<tr><td><b>${esc(g.up)}</b></td><td class="num">${g.tot}</td>
      <td><select data-ow="${esc(g.up)}" data-f="emp" style="width:210px">
        <option value="">— 미지정 —</option>${opts}
        <option value="_manual" ${manual?'selected':''}>＋ 직접입력…</option></select>
        ${manual?`<input data-ow="${esc(g.up)}" data-f="name" value="${esc(st.name||'')}" placeholder="이름" style="width:90px;margin-top:4px">`:''}</td>
      <td><input data-ow="${esc(g.up)}" data-f="email" value="${esc(st.email||'')}" placeholder="${esc(o.auto?o.email:'이메일')}" style="width:230px"></td>
      <td class="hint">${st.emp?(o.auto?'':'지정됨'):(o.name?'자동 추천: '+esc(o.name):'후보 없음 — 직접입력')}</td></tr>`;
  }).join('');
  $$('#ownerBody select,#ownerBody input').forEach(i=>i.onchange=()=>{
    const u=i.dataset.ow; ST.owners[u]=ST.owners[u]||{};
    if(i.dataset.f==='emp'){
      const v=i.value;
      if(!v){ delete ST.owners[u]; }
      else if(v==='_manual'){ ST.owners[u]={emp:'_manual',name:'',email:ST.owners[u].email||''}; }
      else { const c=PEOPLE.find(p=>String(p.emp)===v); ST.owners[u]={emp:v,name:c.name,email:c.email}; }
    } else ST.owners[u][i.dataset.f]=i.value.trim();
    save(); renderMap(); renderDept(); fillMailOwner();
  });
  const only=$('#onlyNoRcpt').checked;
  const gs=agg(key).filter(g=>g.done<g.tot);
  $('#rcptBox').innerHTML = gs.map(g=>{
    const r=rcptOf(g.k); if(only&&r.to.length) return '';
    const chips = r.to.length? r.to.map(x=>`<span class="chip"><b>${esc(x.name)}</b> ${esc(x.pos)} <span class="hint">${esc(x.email)}</span>${x.extra?`<span class="x" data-del="${esc(g.k)}" data-em="${esc(x.email)}">✕</span>`:''}</span>`).join('')
      : '<span class="pill p-warn">수신자 없음 — 직접 추가 필요</span>';
    const ccc = r.cc.map(x=>`<span class="chip" style="opacity:.75">CC ${esc(x.name)} ${esc(x.pos)}</span>`).join('');
    return `<details class="acc"><summary>${esc(g.up)} › ${esc(g.dept)}
      <span class="pill ${r.to.length?'p-brand':'p-warn'}">수신 ${r.to.length}</span>
      <span class="pill p-bad">미이수 ${g.tot-g.done}</span></summary>
      <div class="body"><div class="chips" style="margin-bottom:8px">${chips}${ccc}</div>
      <div class="row"><input placeholder="이름" data-k="${esc(g.k)}" data-f="name" style="width:90px">
      <input placeholder="직위(예: 조장)" data-k="${esc(g.k)}" data-f="pos" style="width:110px">
      <input placeholder="이메일" data-k="${esc(g.k)}" data-f="email" style="width:220px">
      <button class="btn sec mini" data-add="${esc(g.k)}">＋ 수신자 추가</button></div></div></details>`;
  }).join('') || '<div class="empty">모든 부서가 이수 완료되었습니다 🎉</div>';
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
