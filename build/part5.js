
/* ---------- mail ---------- */
function fillMailOwner(){
  const ups=[...new Set(PEOPLE.map(p=>p.up))].sort();
  const cur=$('#mOwner').value;
  $('#mOwner').innerHTML='<option value="">전체 (모든 상위부서)</option>'+ups.map(u=>{
    const o=ownerOf(u); return `<option value="${esc(u)}" ${u===cur?'selected':''}>${esc(u)}${o.name?' — '+esc(o.name):''}</option>`;
  }).join('');
}
function mailTargets(p){
  const s=$('#mSubj').value;
  if(s==='any') return !p.h||!p.d;
  if(s==='h') return !p.h;
  if(s==='d') return !p.d;
  return !p.h&&!p.d;
}
function buildJobs(){
  const up=$('#mOwner').value, unit=$('#mUnit').value;
  const pool=PEOPLE.filter(p=>(!up||p.up===up)&&mailTargets(p));
  const g=new Map();
  pool.forEach(p=>{const k=unit==='dept'?key(p):p.up; if(!g.has(k))g.set(k,[]); g.get(k).push(p);});
  const jobs=[];
  [...g.entries()].sort((a,b)=>b[1].length-a[1].length).forEach(([k,list])=>{
    let to=[],cc=[],label;
    if(unit==='dept'){ const r=rcptOf(k); to=r.to; cc=r.cc; label=r.up+' › '+r.dept; }
    else{ const seen=new Set(); label=k;
      const dks=[...new Set(list.map(key))].map(dk=>rcptOf(dk));
      dks.forEach(r=>r.to.forEach(x=>{if(!seen.has(x.email)){seen.add(x.email);to.push(x);}}));
      dks.forEach(r=>r.cc.forEach(x=>{if(!seen.has(x.email)){seen.add(x.email);cc.push(x);}}));
    }
    list.sort((a,b)=>a.dept.localeCompare(b.dept)||a.pos.localeCompare(b.pos)||a.name.localeCompare(b.name));
    const subject=$('#mSubject').value
      .replace(/{부서}/g,unit==='dept'?k.split('§')[1]:k).replace(/{상위부서}/g,unit==='dept'?k.split('§')[0]:k)
      .replace(/{N}/g,list.length).replace(/{마감}/g,DEADLINE);
    jobs.push({k,label,to,cc,list,subject,file:`메일첨부_${safe(unit==='dept'?k.replace('§','_'):k)}_${today()}.xlsx`});
  });
  return jobs;
}
function bodyHtml(j){
  const note=$('#mNote').value.trim();
  const rows=j.list.map(p=>`<tr><td>${esc(p.dept)}</td><td>${esc(p.pos)}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.emp)}</td>
    <td style="color:${p.h?'#12805c':'#c0392f'}">${p.h?'이수':'<b>미이수</b>'}</td>
    <td style="color:${p.d?'#12805c':'#c0392f'}">${p.d?'이수':'<b>미이수</b>'}</td></tr>`).join('');
  const tbl=$('#mInline').checked?`<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:12px;font-family:맑은 고딕">
    <thead><tr style="background:#DCE6F1"><th>부서</th><th>직급</th><th>이름</th><th>사번</th><th>성희롱</th><th>장애인</th></tr></thead>
    <tbody>${rows}</tbody></table>`:'';
  return `<div style="font-family:맑은 고딕,Malgun Gothic,sans-serif;font-size:14px;line-height:1.7;color:#222">
<p>안녕하세요, <b>${esc(j.label)}</b> 직책자 여러분.</p>
<p>${new Date().toISOString().slice(0,10)} 기준 <b>법정의무교육(성희롱 예방 / 장애인 인식개선)</b> 미이수자가
<b style="color:#c0392f">${j.list.length}명</b> 남아 있어 안내드립니다.</p>
<p>교육기간은 <b>${START} ~ ${DEADLINE}</b>이며, <b>올해 내 전원 이수</b>가 법적 의무사항입니다.<br>
소속 인원이 기간 내 이수를 완료할 수 있도록 독려 부탁드립니다.</p>
${note?`<p style="background:#FDF1DD;padding:10px;border-left:3px solid #b26a00"><b>${esc(note)}</b></p>`:''}
<p><b>■ 미이수 대상자 (${j.list.length}명)</b>${$('#mAttach').checked?' — 첨부 엑셀 참조':''}</p>
${tbl}
<p style="margin-top:16px;color:#666;font-size:12px">※ 본 메일은 법정의무교육 이수관리 시스템에서 자동 생성되었습니다.<br>
※ 문의: ${esc(ownerOf(j.list[0].up).name||'교육 담당자')}</p></div>`;
}
function renderMail(){
  const jobs=buildJobs();
  $('#mCount').textContent=`${jobs.length}건 · 대상 ${jobs.reduce((a,j)=>a+j.list.length,0)}명`;
  $('#mList').innerHTML = jobs.length? jobs.map(j=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)">
    <div class="row"><b>${esc(j.label)}</b><span class="pill p-bad">${j.list.length}명</span>
    <span class="pill ${j.to.length?'p-brand':'p-warn'}">수신 ${j.to.length}</span>
    <span class="pill p-mute">CC ${j.cc.length}</span></div>
    <div class="hint" style="margin-top:3px">${j.to.length? j.to.map(x=>esc(x.name)+' &lt;'+esc(x.email)+'&gt;').join(', ') : '⚠ 수신자 미지정 — ④ 매핑 탭에서 추가하세요'}</div>
    </div>`).join('') : '<div class="empty">발송 대상이 없습니다.</div>';
  const j=jobs[0];
  $('#mPreview').innerHTML = j? `<div class="hint" style="margin-bottom:8px"><b>제목:</b> ${esc(j.subject)}<br><b>받는사람:</b> ${esc(j.to.map(x=>x.email).join('; '))}<br><b>참조:</b> ${esc(j.cc.map(x=>x.email).join('; '))}</div>
    <div style="border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff;color:#222;overflow:auto">${bodyHtml(j)}</div>` : '<div class="hint">대상 없음</div>';
  return jobs;
}
function psq(s){return String(s).replace(/'/g,"''");}
function buildPs1(jobs){
  const auto=$('#mAutoSend').checked;
  let s=`# 테크젠 법정의무교육 독려메일 자동발송 (Outlook)
# 생성일: ${new Date().toLocaleString('ko-KR')}
# 실행: 이 파일과 xlsx 첨부파일을 같은 폴더에 두고 우클릭 > PowerShell에서 실행
#       차단 시 -> powershell -ExecutionPolicy Bypass -File .\\보내기_법정의무교육.ps1
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$AUTO_SEND = $${auto?'true':'false'}    # $true 로 바꾸면 확인창 없이 즉시 발송
$base = Split-Path -Parent $MyInvocation.MyCommand.Definition
try { $ol = New-Object -ComObject Outlook.Application }
catch { Write-Host "[오류] Outlook을 실행할 수 없습니다. Outlook 설치 PC에서 실행하세요." -ForegroundColor Red; Read-Host "엔터"; exit 1 }
$n = 0
`;
  jobs.forEach((j,i)=>{
    if(!j.to.length) { s+=`\nWrite-Host "[건너뜀] ${psq(j.label)} - 수신자 없음" -ForegroundColor Yellow\n`; return; }
    const body=bodyHtml(j).replace(/^'@/gm,"' @");
    s+=`
# ---------- ${i+1}/${jobs.length}  ${j.label}  (${j.list.length}명) ----------
$to   = '${psq(j.to.map(x=>x.email).join('; '))}'
$cc   = '${psq(j.cc.map(x=>x.email).join('; '))}'
$subj = '${psq(j.subject)}'
$att  = '${psq(j.file)}'
$body = @'
${body}
'@
$m = $ol.CreateItem(0)
$m.To = $to
if ($cc -ne '') { $m.CC = $cc }
$m.Subject = $subj
$m.HTMLBody = $body
$p = Join-Path $base $att
if (Test-Path -LiteralPath $p) { $m.Attachments.Add($p) | Out-Null } else { Write-Host "  (첨부 없음: $att)" -ForegroundColor DarkYellow }
if ($AUTO_SEND) { $m.Send(); Write-Host "[발송] ${psq(j.label)} -> $to" -ForegroundColor Green }
else { $m.Display() ; Write-Host "[창열림] ${psq(j.label)}" -ForegroundColor Cyan }
$n++
`;
  });
  s+=`
Write-Host ""
Write-Host "총 $n 건 처리 완료." -ForegroundColor Green
if (-not $AUTO_SEND) { Write-Host "Outlook 창에서 내용 확인 후 [보내기]를 눌러주세요." -ForegroundColor Yellow }
Read-Host "엔터를 누르면 종료"
`;
  return s;
}
function packDownload(){
  const jobs=renderMail();
  if(!jobs.length){toast('발송 대상이 없습니다');return;}
  const files=[];
  if($('#mAttach').checked) jobs.forEach(j=>{
    files.push({name:j.file,data:new Uint8Array(0),_blob:xlsxBlob([{name:'미이수자',rows:[HEAD,...j.list.map(toRow)]}])});
  });
  const ps=buildPs1(jobs);
  const bom=new Uint8Array([0xEF,0xBB,0xBF]);
  const psb=ENC.encode(ps);
  const psFull=new Uint8Array(bom.length+psb.length); psFull.set(bom); psFull.set(psb,bom.length);
  Promise.all(files.map(f=>f._blob.arrayBuffer())).then(bufs=>{
    const out=files.map((f,i)=>({name:f.name,data:new Uint8Array(bufs[i])}));
    out.push({name:'보내기_법정의무교육.ps1',data:psFull});
    out.push({name:'읽어주세요.txt',data:(()=>{const t=`법정의무교육 독려메일 발송 안내
1) 이 ZIP의 모든 파일을 한 폴더에 압축 해제하세요.
2) 보내기_법정의무교육.ps1 우클릭 > "PowerShell에서 실행"
   (차단될 경우 PowerShell 창에서)
   powershell -ExecutionPolicy Bypass -File .\\보내기_법정의무교육.ps1
3) Outlook 새 메일 창이 순서대로 열립니다. 내용 확인 후 [보내기].
   * 즉시 발송을 원하면 ps1 파일 상단 $AUTO_SEND 를 $true 로 변경.
발송 건수: ${jobs.length}건 / 대상 ${jobs.reduce((a,j)=>a+j.list.length,0)}명
생성일: ${new Date().toLocaleString('ko-KR')}`;
      const b=ENC.encode(t);const r=new Uint8Array(3+b.length);r.set([0xEF,0xBB,0xBF]);r.set(b,3);return r;})()});
    dl(zipStore(out),`법정의무교육_독려메일_${today()}.zip`);
    toast(`${jobs.length}건 패키지 생성 완료 — 압축을 풀고 ps1을 실행하세요`);
  });
}
function mailtoOpen(){
  const jobs=buildJobs();
  const j=jobs.find(x=>x.to.length);
  if(!j){toast('수신자가 지정된 발송 건이 없습니다');return;}
  const txt=`안녕하세요, ${j.label} 직책자 여러분.\n\n법정의무교육(성희롱 예방 / 장애인 인식개선) 미이수자가 ${j.list.length}명 남아 있습니다.\n교육기간: ${START} ~ ${DEADLINE} (올해 내 전원 이수 필수)\n\n[미이수 명단]\n`
    + j.list.map(p=>`- ${p.dept} / ${p.pos} / ${p.name}(${p.emp}) : ${!p.h&&!p.d?'성희롱+장애인':(!p.h?'성희롱':'장애인')} 미이수`).join('\n')
    + `\n\n기간 내 이수 완료하도록 독려 부탁드립니다.`;
  const url=`mailto:${encodeURIComponent(j.to.map(x=>x.email).join(';'))}?cc=${encodeURIComponent(j.cc.map(x=>x.email).join(';'))}&subject=${encodeURIComponent(j.subject)}&body=${encodeURIComponent(txt.slice(0,1800))}`;
  location.href=url;
  if(jobs.length>1) toast(`첫 번째 건(${j.label})만 열립니다. 여러 건은 ZIP 방식을 사용하세요.`,3500);
}

/* ---------- todo checklist ---------- */
const TODO=[
 ['이수 인정 기준 확정','집체교육 참석자 명단과 온라인 수료 데이터를 어떻게 합칠지. 집체 참석자는 별도 사번 목록으로 받아 ③탭에서 동일하게 반영하면 됩니다.'],
 ['교육 미이수 시 과태료 안내 문구','성희롱 예방교육 미실시 500만원 이하, 장애인 인식개선 미실시 300만원 이하 과태료. 독려메일 본문 안내문에 넣으면 효과가 큽니다.'],
 ['신규입사자·퇴사자 반영 주기','매주 인사팀 인원변동 명단을 받아 ③탭 &lt;인원 추가&gt;로 등록. 퇴사자는 검색 후 제외 처리 필요.'],
 ['교육 미이수자 부서장 보고 라인','2주 연속 미이수 부서는 실장/팀장 별도 보고. ②탭 이수율 낮은 순 정렬을 그대로 캡처해 사용.'],
 ['개인정보·직장내 괴롭힘 과목','원본 파일에는 4과목(성희롱/장애인/개인정보/괴롭힘)이 있습니다. 나머지 2과목도 관리하려면 컬럼 추가가 가능합니다.'],
 ['이메일 정확도 점검','사번@teczen.kr 형태 계정이 다수입니다. 실제 수신 가능한 계정인지 1회 테스트 발송 권장.'],
 ['수신자 없는 부서 보완','④탭에서 &lt;수신자 없는 부서만&gt; 체크 → 이미 이수해 명단에 없는 조장/반장을 직접 추가해야 합니다.'],
 ['주간 백업 규칙','금요일 오전 ⤓백업 → 공유폴더 저장. 브라우저 캐시 삭제 시 데이터가 사라집니다.'],
 ['최종 증빙 보관','이수 완료 후 교육기관 수료증/이수자 명단을 3년간 보관해야 합니다(근로자참여법·장애인고용법 점검 대비).'],
];
function renderTodo(){
  const chk=ST.todo||{};
  $('#todoBox').innerHTML=TODO.map((t,i)=>`<label style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--line2);cursor:pointer">
    <input type="checkbox" data-todo="${i}" ${chk[i]?'checked':''}>
    <span><b style="${chk[i]?'text-decoration:line-through;opacity:.55':''}">${t[0]}</b><br><span class="hint">${t[1]}</span></span></label>`).join('');
  $$('#todoBox input').forEach(c=>c.onchange=()=>{ST.todo=ST.todo||{};ST.todo[c.dataset.todo]=c.checked;save();renderTodo();});
}
