
/* ---------- tabs & events ---------- */
function go(t){
  $$('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  ['main','dept','update','map','mail','help'].forEach(x=>$('#tab-'+x).hidden = x!==t);
  if(t==='dept') renderDept();
  if(t==='map') renderMap();
  if(t==='mail'){ fillMailOwner(); renderMail(); }
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
$('#onlyRemain').onchange=renderDept;
$('#btnXlsxDept').onclick=()=>{
  const rows=[['상위부서','부서','인원','성희롱 미이수','장애인 미이수','둘다 미이수','이수완료','이수율(%)','담당(서무)','수신 직책자']];
  agg(key).forEach(g=>{const r=rcptOf(g.k),o=ownerOf(g.up);
    rows.push([g.up,g.dept,g.tot,g.hNo,g.dNo,g.both,g.done,Number(g.rate.toFixed(1)),o.name||'',r.to.map(x=>`${x.name}(${x.pos})`).join(', ')]);});
  const rows2=[['상위부서','인원','이수완료','이수율(%)','담당(서무)','담당 이메일']];
  agg(p=>p.up).forEach(g=>{const o=ownerOf(g.up);rows2.push([g.up,g.tot,g.done,Number(g.rate.toFixed(1)),o.name||'',o.email||'']);});
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
  $('#'+id).onchange=e=>{ST.rules[kk]=e.target.checked?1:0;save();renderMap();renderDept();};
});
$('#btnRebuild').onclick=()=>{renderMap();renderDept();toast('수신자 재계산 완료');};
$('#onlyNoRcpt').onchange=renderMap;
['mOwner','mUnit','mSubj','mAttach','mInline','mAutoSend'].forEach(id=>$('#'+id).onchange=renderMail);
['mSubject','mNote'].forEach(id=>$('#'+id).oninput=()=>{clearTimeout(window._mt);window._mt=setTimeout(renderMail,250);});
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
    ST=Object.assign({done:{},owners:{},extra:{},added:[],hist:[],rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1}},s);
    save(); build(); refreshAll(); renderHist(); toast('복원 완료 — '+(j.at?j.at.slice(0,10):''));
  }catch(err){ toast('올바른 백업 파일이 아닙니다'); } e.target.value=''; };
  r.readAsText(f);
};
$('#btnHardReset').onclick=()=>{
  if(!confirm('모든 이수 처리·매핑·추가 인원을 삭제하고 원본 상태로 되돌립니다.\n되돌릴 수 없습니다. 계속할까요?')) return;
  localStorage.removeItem(LS);
  ST={done:{},owners:{},extra:{},added:[],hist:[],rules:{mgr:1,lead:1,tech:0,teamcc:1,ownercc:1},theme:ST.theme};
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
