
/* ---------- tabs & events ---------- */
function go(t){
  $$('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  ['main','dept','update','map','mail','help'].forEach(x=>$('#tab-'+x).hidden = x!==t);
  if(t==='dept') renderDept();
  if(t==='map'){ renderMap(); renderMasterCount(); }
  if(t==='mail'){ fillMailOwner(); $('#mJobMgr').checked=!!ST.rules.mgr; $('#mJobField').checked=!!ST.rules.lead; renderMail(); }
  if(t==='help') renderTodo();
  window.scrollTo(0,0);
}
$$('nav.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));

function refreshAll(){ renderKpi(); fillSelects(); renderTable(); }

$('#fStat').onchange=e=>{F.stat=e.target.value;renderTable();};
$('#fUp').onchange=e=>{F.up=e.target.value;F.dept='';fillSelects();renderTable();};
$('#fDept').onchange=e=>{F.dept=e.target.value;renderTable();};
$('#fPos').onchange=e=>{F.pos=e.target.value;renderTable();};
$('#fJob').onchange=e=>{F.job=e.target.value;renderTable();};
let qt; $('#fQ').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{F.q=e.target.value.trim();renderTable();},180);};
$('#btnReset').onclick=()=>{F={stat:'notdone',up:'',dept:'',pos:'',job:'',q:''};SEL.clear();$('#fQ').value='';$('#fStat').value='notdone';$('#fJob').value='';fillSelects();renderTable();};
$$('#tbl thead th[data-s]').forEach(th=>th.onclick=()=>{
  const k=th.dataset.s; SORT.dir = SORT.k===k ? -SORT.dir : 1; SORT.k=k; renderTable();
});
$('#tbody').addEventListener('change',e=>{
  if(e.target.dataset.e){ e.target.checked?SEL.add(e.target.dataset.e):SEL.delete(e.target.dataset.e); renderTable(); }
});
$('#chkAll').onchange=e=>{ const r=filtered(); e.target.checked?r.forEach(p=>SEL.add(p.emp)):r.forEach(p=>SEL.delete(p.emp)); renderTable(); };
$('#btnXlsxAll').onclick=()=>{
  const t=targets(); if(!t.length){toast('대상이 없습니다');return;}
  dl(xlsxBlob([{name:'미이수자',rows:[HEAD,...t.map(toRow)]}]),`법정의무교육_대상자_${today()}.xlsx`);
  toast(`${t.length}명 엑셀 다운로드`);
};
$('#btnCopyMail').onclick=()=>{
  const t=targets(); const s=[...new Set(t.map(p=>p.email))].join('; ');
  navigator.clipboard.writeText(s).then(()=>toast(`${t.length}명 이메일 복사됨`),()=>toast('복사 실패'));
};
$('#btnGoMail').onclick=()=>{ if(F.up){go('mail');$('#mOwner').value=F.up;renderMail();} else go('mail'); };
// ⑤탭의 Ⓐ/Ⓑ 체크박스는 ④탭 규칙과 같은 값을 공유합니다.
// Ⓐ·Ⓑ 를 둘 다 끄면 보낼 것이 아예 없어지므로 마지막 하나는 끄지 못하게 합니다.
function setJobRule(which, on){
  ST.rules[which] = on?1:0;
  if(!ST.rules.mgr && !ST.rules.lead){
    ST.rules[which]=1;
    toast('Ⓐ와 Ⓑ 중 하나는 켜져 있어야 합니다',2600);
  }
  save();
  $('#mJobMgr').checked=!!ST.rules.mgr; $('#mJobField').checked=!!ST.rules.lead;
  renderMail();
}
$('#mJobMgr').onchange=e=>setJobRule('mgr',e.target.checked);
$('#mJobField').onchange=e=>setJobRule('lead',e.target.checked);
$('#onlyRemain').onchange=renderDept;
$('#btnXlsxDept').onclick=()=>{
  const rows=[['상위부서','부서','인원','성희롱 미이수','장애인 미이수','둘다 미이수','이수완료','이수율(%)','담당(서무)','수신 직책자']];
  agg(key).forEach(g=>{const r=rcptOf(g.k),o=ownerOf(g.up,g.dept);
    rows.push([g.up,g.dept,g.tot,g.hNo,g.dNo,g.both,g.done,Number(g.rate.toFixed(1)),o.name||'',r.to.map(x=>`${x.name}(${x.pos})`).join(', ')]);});
  const rows2=[['상위부서','인원','이수완료','이수율(%)','담당(서무)','담당 이메일']];
  agg(p=>p.up).forEach(g=>{const o=ownerOf(g.up,g.up);rows2.push([g.up,g.tot,g.done,Number(g.rate.toFixed(1)),o.name||'',o.email||'']);});
  dl(xlsxBlob([{name:'상위부서별',rows:rows2},{name:'부서별',rows},{name:'전체명단',rows:[HEAD,...PEOPLE.map(toRow)]}]),`법정의무교육_현황집계_${today()}.xlsx`);
  toast('집계 엑셀 다운로드');
};
$('#btnApply').onclick=()=>applyDone(false);
$('#btnPreview').onclick=()=>applyDone(true);
$('#btnUndo').onclick=()=>{
  if(!ST.hist.length){toast('취소할 이력이 없습니다');return;}
  const h=ST.hist.shift();
  h.undo.forEach(u=>{ ST.done[u.emp]=u.before; if(!Object.keys(u.before).length) delete ST.done[u.emp]; });
  save(); build(); refreshAll(); renderHist(); toast(`${h.at} 반영(${h.n}명) 취소됨`);
};
$('#btnClearLog').onclick=()=>{ if(confirm('반영 이력만 삭제합니다(이수 상태는 유지). 계속할까요?')){ST.hist=[];save();renderHist();} };
$('#btnAddPeople').onclick=()=>{
  const lines=$('#taAdd').value.split(/\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length){toast('입력이 없습니다');return;}
  const ex=new Set(PEOPLE.map(p=>String(p.emp))); let n=0,bad=[];
  lines.forEach(l=>{
    const c=l.split(/[,\t]/).map(x=>x.trim());
    if(c.length<6||!c[1]){bad.push(l);return;}
    if(ex.has(c[1])){bad.push(l+' (사번 중복)');return;}
    ST.added.push({name:c[0],emp:c[1],pos:c[2]||'기술사원',up:c[3]||'',dept:c[4]||'',email:c[5]||'',tel:c[6]||'',h:0,d:0});
    ex.add(c[1]); n++;
  });
  save(); build(); refreshAll();
  $('#taAdd').value='';
  toast(`${n}명 추가${bad.length?` · ${bad.length}건 형식오류`:''}`);
  if(bad.length) $('#applyResult').innerHTML=`<div class="warnbox"><b>추가 실패 ${bad.length}건</b><br>${bad.map(esc).join('<br>')}</div>`;
};
['rMgr','rLead','rTech','rTeamCC','rOwnerCC'].forEach((id,i)=>{
  const kk=['mgr','lead','tech','teamcc','ownercc'][i];
  $('#'+id).onchange=e=>{
    ST.rules[kk]=e.target.checked?1:0;
    if(!ST.rules.mgr && !ST.rules.lead){ ST.rules[kk]=1; toast('Ⓐ와 Ⓑ 중 하나는 켜져 있어야 합니다',2600); }
    save(); renderMap(); renderDept();
  };
});
$('#btnRebuild').onclick=()=>{renderMap();renderDept();toast('수신자 재계산 완료');};
// 조장·반장이 명단에 없어 대체 발송되는 부서 목록
function needFixList(){
  return agg(key).filter(g=>g.done<g.tot)
    .map(g=>({g, r:rcptOf(g.k)})).filter(x=>x.r.needsFix);
}
function renderMasterCount(){
  const m=ST.master||[], tl=m.filter(x=>x.pos==='팀장').length, b=$('#masterCount');
  b.textContent = m.length? `팀장 ${tl}명 · 조장/반장 ${m.length-tl}명` : '미등록';
  b.className='pill '+(m.length?'p-ok':'p-mute');
  $('#mMasterOnly').checked=!!ST.rules.masterOnly;
}
$('#btnMasterForm').onclick=()=>{
  // 지금 시스템이 아는 값을 미리 채워서 내보냅니다. 빈 칸만 채워 돌려주면 됩니다.
  const rows=[['상위부서','부서','이름','직위','이메일','비고']];
  const ups=[...new Set(PEOPLE.filter(p=>!p.h||!p.d).map(p=>p.up))].sort();
  ups.forEach(up=>{
    const tl=teamLeadOf({up,dept:up});
    rows.push([up,'',tl?tl.name:'','팀장',tl?tl.email:'',tl?'':'← 팀장 정보 없음, 채워주세요']);
    agg(key).filter(g=>g.up===up&&g.done<g.tot).forEach(g=>{
      const leads=rcptOf(g.k).to.filter(x=>LEAD.includes(x.pos));
      if(leads.length) leads.forEach(x=>rows.push([up,g.dept,x.name,x.pos,x.email,'']));
      else rows.push([up,g.dept,'','조장','','← 조장/반장 정보 없음, 꼭 채워주세요']);
    });
  });
  dl(xlsxBlob([{name:'수신자 마스터 양식',rows}]),`수신자마스터_양식_${today()}.xlsx`);
  toast('양식 다운로드 — 빈 칸을 채워 다시 붙여넣으세요',3200);
};
$('#btnMasterClear').onclick=()=>{
  if(!confirm('등록된 수신자 마스터를 전부 지웁니다. 계속할까요?')) return;
  ST.master=[]; save(); renderMasterCount(); renderMap(); renderDept(); toast('마스터 비움');
};
$('#mMasterOnly').onchange=e=>{ST.rules.masterOnly=e.target.checked?1:0;save();renderMap();renderDept();};
/* 붙여넣은 한 줄에서 상위부서/부서/이름/직위/이메일을 추론합니다.
   사내 엑셀마다 열 순서가 달라서 위치가 아니라 값의 생김새로 판별합니다.
     - 이메일: @ 가 들어간 토큰
     - 직위  : 팀장/조장/반장/주임 중 하나와 일치하는 토큰 (없으면 일괄 지정값)
     - 상위부서/부서: 실제 명단에 있는 이름과 일치하는 토큰
     - 남은 토큰: 이름                                                    */
const POSNAMES=['팀장','조장','반장','주임'];
function parseMasterLine(raw, defPos, ups, deptsByUp, allDepts){
  const t=raw.split(/\t|,|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  if(!t.length) return {err:'빈 줄'};
  const emailIdx=t.findIndex(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if(emailIdx<0) return {err:'이메일을 찾을 수 없습니다'};
  const email=t.splice(emailIdx,1)[0];
  let pos='';
  const pi=t.findIndex(x=>POSNAMES.includes(x));
  if(pi>=0) pos=t.splice(pi,1)[0]; else pos=defPos;
  if(!pos) return {err:'직위(팀장/조장/반장/주임)를 찾을 수 없습니다 — 위에서 일괄 지정하세요'};
  let up='', dept='';
  const ui=t.findIndex(x=>ups.has(x));
  if(ui>=0) up=t.splice(ui,1)[0];
  const di=t.findIndex(x=>allDepts.has(x));
  if(di>=0) dept=t.splice(di,1)[0];
  if(!up && dept){                                  // 부서만 있으면 상위부서를 역추적
    const owner=[...deptsByUp.entries()].filter(([u,ds])=>ds.has(dept));
    if(owner.length===1) up=owner[0][0];
    else if(owner.length>1) return {err:`부서 "${dept}"가 여러 상위부서에 있습니다 — 상위부서도 함께 넣어주세요`};
  }
  if(!up) return {err:'상위부서를 찾을 수 없습니다'};
  if(pos==='팀장') dept='';
  else if(!dept) return {err:'부서를 찾을 수 없습니다 (조장·반장은 부서가 필요합니다)'};
  const name=t.filter(x=>!/^\d+$/.test(x)).join(' ').trim() || email.split('@')[0];
  return {up,dept,name,pos,email};
}
$('#btnAddMaster').onclick=()=>{
  const lines=$('#taMaster').value.split(/\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length){toast('입력이 없습니다');return;}
  const defPos=$('#mPosDefault').value;
  const ups=new Set(PEOPLE.map(p=>p.up));
  const allDepts=new Set(PEOPLE.map(p=>p.dept));
  const deptsByUp=new Map();
  PEOPLE.forEach(p=>{ if(!deptsByUp.has(p.up)) deptsByUp.set(p.up,new Set()); deptsByUp.get(p.up).add(p.dept); });
  ST.master=ST.master||[];
  let n=0,upd=0; const bad=[];
  lines.forEach(l=>{
    if(/상위부서|이메일|메일주소/.test(l) && !/@/.test(l)) return;      // 헤더 줄
    const r=parseMasterLine(l, defPos, ups, deptsByUp, allDepts);
    if(r.err){ bad.push(`${l}  →  ${r.err}`); return; }
    const i=ST.master.findIndex(m=>m.email.toLowerCase()===r.email.toLowerCase()&&m.up===r.up&&m.dept===r.dept);
    if(i>=0){ ST.master[i]=r; upd++; } else { ST.master.push(r); n++; }
  });
  save(); renderMasterCount(); renderMap(); renderDept();
  $('#taMaster').value = bad.length? bad.map(b=>b.split('  →  ')[0]).join('\n') : '';
  $('#masterResult').innerHTML = `<div class="${bad.length?'warnbox':'okbox'}">
    <b>신규 ${n}명 등록${upd?` · ${upd}명 갱신`:''}${bad.length?` · ${bad.length}줄 실패`:''}</b>
    ${bad.length?'<br><span class="hint">실패한 줄만 입력창에 남겨뒀습니다.</span><br>'+bad.slice(0,30).map(esc).join('<br>')+(bad.length>30?`<br>… 외 ${bad.length-30}줄`:''):''}</div>`;
  toast(`마스터 ${n+upd}건 반영${bad.length?` · ${bad.length}줄 실패`:''}`);
};
// mJobMgr / mJobField 는 아래 setJobRule 전용 핸들러가 따로 있으므로 여기 넣지 않습니다.
['mOwner','mSubj','mAttach','mInline','mAutoSend'].forEach(id=>$('#'+id).onchange=renderMail);
['mSubject','mSubjectA','mNote'].forEach(id=>$('#'+id).oninput=()=>{clearTimeout(window._mt);window._mt=setTimeout(renderMail,250);});
$('#btnPack').onclick=packDownload;
$('#btnMailto').onclick=mailtoOpen;
$('#btnCopyAll').onclick=()=>{
  const jobs=buildJobs(); const s=[...new Set(jobs.flatMap(j=>j.to.concat(j.cc)).map(x=>x.email))].join('; ');
  if(!s){toast('수신자가 없습니다');return;}
  navigator.clipboard.writeText(s).then(()=>toast('수신자 주소 복사됨'),()=>toast('복사 실패'));
};
$('#btnBackup').onclick=()=>{
  const b=new Blob([JSON.stringify({v:1,at:new Date().toISOString(),state:ST},null,1)],{type:'application/json'});
  dl(b,`법정의무교육_백업_${today()}.json`); toast('백업 파일 저장됨');
};
$('#btnRestore').onclick=()=>$('#fileIn').click();
$('#fileIn').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{ try{ const j=JSON.parse(r.result); const s=j.state||j;
    if(!s.done) throw 0;
    ST=Object.assign({done:{},owners:{},extra:{},added:[],hist:[],master:[],rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1,masterOnly:0}},s);
    save(); build(); refreshAll(); renderHist(); toast('복원 완료 — '+(j.at?j.at.slice(0,10):''));
  }catch(err){ toast('올바른 백업 파일이 아닙니다'); } e.target.value=''; };
  r.readAsText(f);
};
$('#btnHardReset').onclick=()=>{
  if(!confirm('모든 이수 처리·매핑·추가 인원을 삭제하고 원본 상태로 되돌립니다.\n되돌릴 수 없습니다. 계속할까요?')) return;
  localStorage.removeItem(LS);
  ST={done:{},owners:{},extra:{},added:[],hist:[],master:[],rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1,masterOnly:0},theme:ST.theme};
  save(); build(); refreshAll(); renderHist(); renderTodo(); toast('초기화 완료');
};
$('#btnTheme').onclick=()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  const next = cur==='dark'?'light':cur==='light'?'':'dark';
  next?document.documentElement.setAttribute('data-theme',next):document.documentElement.removeAttribute('data-theme');
  ST.theme=next; save();
};
if(ST.theme) document.documentElement.setAttribute('data-theme',ST.theme);
window.addEventListener('beforeunload',e=>{ if($('#taPaste').value.trim()){e.preventDefault();e.returnValue='';} });

/* ---------- init ---------- */
refreshAll(); renderHist(); renderTodo();
</script>
