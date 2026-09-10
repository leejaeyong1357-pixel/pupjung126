
/* ---------- mail ---------- */
function fillMailOwner(){
  const ups=[...new Set(PEOPLE.map(p=>p.up))].sort();
  const cur=$('#mOwner').value;
  $('#mOwner').innerHTML='<option value="">전체 (모든 상위부서)</option>'+ups.map(u=>{
    const o=ownerOf(u,u); return `<option value="${esc(u)}" ${u===cur?'selected':''}>${esc(u)}${o.name?' — '+esc(o.name):''}</option>`;
  }).join('');
}
function mailTargets(p){
  const s=$('#mSubj').value;
  if(s==='any') return !p.h||!p.d;
  if(s==='h') return !p.h;
  if(s==='d') return !p.d;
  return !p.h&&!p.d;
}
function fillSubject(tpl,o){
  return tpl.replace(/{이름}/g,o.name||'').replace(/{부서}/g,o.dept||'').replace(/{상위부서}/g,o.up||'')
            .replace(/{N}/g,o.n!=null?o.n:'').replace(/{마감}/g,DEADLINE);
}
/* Ⓐ 관리직 미이수자 → 본인 1통, 팀장 CC
   Ⓑ 현장직 미이수자 → 부서 1통, 조장·반장·주임 수신, 팀장 CC (기술사원 본인에게는 발송 안 함) */
function buildJobs(){
  const up=$('#mOwner').value;
  const pool=PEOPLE.filter(p=>(!up||p.up===up)&&mailTargets(p));
  const jobs=[];
  const R=ST.rules;

  if(R.mgr) pool.filter(p=>p.job==='mgr').sort((a,b)=>a.up.localeCompare(b.up)||a.name.localeCompare(b.name))
    .forEach(p=>{
      const tl=teamLeadOf(p), o=ownerOf(p.up,p.dept), cc=[];
      if(R.teamcc&&tl&&tl.email!==p.email) cc.push(tl);
      if(R.ownercc&&o.email&&o.email!==p.email&&!cc.some(c=>c.email===o.email)) cc.push({name:o.name,email:o.email,pos:'담당(서무)'});
      jobs.push({type:'A', k:'A§'+p.emp, label:`${p.name} ${p.pos} (${p.dept})`,
        to:[p], cc, list:[p], attach:false,
        subject:fillSubject($('#mSubjectA').value,{name:p.name,dept:p.dept,up:p.up,n:1}), file:''});
    });

  if(R.lead){
    const g=new Map();
    pool.filter(p=>p.job!=='mgr').forEach(p=>{const k=key(p); if(!g.has(k))g.set(k,[]); g.get(k).push(p);});
    [...g.entries()].sort((a,b)=>b[1].length-a[1].length).forEach(([k,list])=>{
      const r=rcptOf(k);
      list.sort((a,b)=>a.pos.localeCompare(b.pos)||a.name.localeCompare(b.name));
      const sub=fillSubject($('#mSubject').value,{dept:r.dept,up:r.up,n:list.length});
      jobs.push({type:'B', k, label:`${r.up} › ${r.dept}`, to:r.to, cc:r.cc, list, via:r.via, needsFix:r.needsFix,
        attach:$('#mAttach').checked,
        subject:(r.needsFix?'[수신자 확인필요] ':'')+sub,
        file:`메일첨부_${safe(k.replace('§','_'))}_${today()}.xlsx`});
    });
  }
  return jobs;
}
function bodyHtml(j){
  const note=$('#mNote').value.trim();
  const one=j.type==='A';
  const rows=j.list.map(p=>`<tr><td>${esc(p.dept)}</td><td>${esc(p.pos)}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.emp)}</td>
    <td style="color:${p.h?'#12805c':'#c0392f'}">${p.h?'이수':'<b>미이수</b>'}</td>
    <td style="color:${p.d?'#12805c':'#c0392f'}">${p.d?'이수':'<b>미이수</b>'}</td></tr>`).join('');
  const tbl=$('#mInline').checked?`<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-size:12px;font-family:맑은 고딕">
    <thead><tr style="background:#DCE6F1"><th>부서</th><th>직급</th><th>이름</th><th>사번</th><th>성희롱</th><th>장애인</th></tr></thead>
    <tbody>${rows}</tbody></table>`:'';
  const p0=j.list[0];
  const missing=p=>!p.h&&!p.d?'성희롱 예방교육, 장애인 인식개선교육':(!p.h?'성희롱 예방교육':'장애인 인식개선교육');
  const fixNote = j.needsFix ? `<p style="background:#FDECEB;padding:11px;border-left:4px solid #c0392f;font-size:13px">
<b>⚠ 수신자 확인이 필요합니다.</b><br>
<b>${esc(j.label)}</b>의 조장·반장 메일 주소가 시스템에 등록되어 있지 않아
(해당 직책자가 이미 교육을 이수해 미이수자 명단에 없음) 부득이 담당자님께 보내드립니다.<br>
아래 명단을 <b>해당 부서 조장·반장에게 전달</b>해 주시고, 직책자 메일 주소를
<b>미래성장팀 이재용 매니저(jason@teczen.kr)</b>에게 알려주시면 다음 주부터 자동 발송됩니다.</p>` : '';
  const head = one
    ? `<p>안녕하세요, <b>${esc(p0.name)} ${esc(p0.pos)}</b>님.</p>
<p>${new Date().toISOString().slice(0,10)} 기준 <b>법정의무교육</b> 중 아래 과목이 <b style="color:#c0392f">미이수</b> 상태입니다.</p>
<p style="background:#FDECEB;padding:10px;border-left:3px solid #c0392f"><b>미이수 과목: ${esc(missing(p0))}</b></p>`
    : `<p>안녕하세요, ${j.needsFix&&j.to[0]?`<b>${esc(j.to[0].name)} ${esc(j.to[0].pos)}</b>님`:`<b>${esc(j.label)}</b> 조장·반장님`}.</p>
<p>${new Date().toISOString().slice(0,10)} 기준 소속 인원 중 <b>법정의무교육 미이수자가
<span style="color:#c0392f">${j.list.length}명</span></b> 남아 있어 안내드립니다.</p>
<p>해당 인원이 기간 내 이수를 완료할 수 있도록 <b>직접 독려</b> 부탁드립니다.</p>`;
  return `<div style="font-family:맑은 고딕,Malgun Gothic,sans-serif;font-size:14px;line-height:1.7;color:#222">
${fixNote}${head}
<p>교육기간은 <b>${START} ~ ${DEADLINE}</b>이며, <b>연내 전원 이수</b>가 법적 의무사항입니다.<br>
미실시 시 성희롱 예방교육 500만원 이하, 장애인 인식개선교육 300만원 이하의 과태료가 부과될 수 있습니다.</p>
${note?`<p style="background:#FDF1DD;padding:10px;border-left:3px solid #b26a00"><b>${esc(note)}</b></p>`:''}
${one?'':`<p><b>■ 미이수 대상자 (${j.list.length}명)</b>${j.attach?' — 첨부 엑셀 참조':''}</p>`}
${tbl}
<p style="margin-top:16px;color:#666;font-size:12px">※ 본 메일은 법정의무교육 이수관리 시스템에서 자동 생성되었습니다.<br>
※ 이수 데이터 관련 문의: 미래성장팀 이재용 매니저 (jason@teczen.kr)</p></div>`;
}
/* 발송 목록이 0건일 때, 어떤 조건 때문인지 정확히 짚어줍니다.
   "없습니다"만 띄우면 사용자가 원인을 찾을 방법이 없습니다. */
function emptyReason(){
  const up=$('#mOwner').value, R=ST.rules;
  const subjLabel=$('#mSubj').selectedOptions[0].textContent;
  if(!R.mgr && !R.lead) return {why:'Ⓐ 관리직 개인메일과 Ⓑ 부서 독려메일이 <b>둘 다 꺼져 있습니다.</b>',
    how:'위 체크박스 두 개를 켜면 바로 목록이 나옵니다.'};
  const scope=PEOPLE.filter(p=>!up||p.up===up);
  if(!scope.length) return {why:`<b>${esc(up)}</b> 소속 인원이 명단에 없습니다.`, how:'발송 담당(서무)을 다시 선택하세요.'};
  const notDone=scope.filter(p=>!p.h||!p.d);
  if(!notDone.length) return {done:true, why:`<b>${esc(up||'전체')}</b> 인원 ${scope.length}명이 <b>모두 이수를 마쳤습니다.</b>`,
    how:'보낼 대상이 없는 것이 정상입니다. 수고하셨습니다.'};
  const sub=notDone.filter(mailTargets);
  if(!sub.length) return {why:`대상 과목이 <b>${esc(subjLabel)}</b>로 되어 있는데, 여기에 해당하는 미이수자가 없습니다.`,
    how:'대상 과목을 <b>미이수 1과목 이상 전원</b>으로 바꿔보세요.'};
  const mgrOnly=sub.every(p=>p.job==='mgr'), fieldOnly=sub.every(p=>p.job!=='mgr');
  if(!R.mgr && mgrOnly) return {why:`남은 미이수자 ${sub.length}명이 <b>전원 관리직</b>인데 <b>Ⓐ 관리직 개인메일이 꺼져 있습니다.</b>`,
    how:'Ⓐ 체크박스를 켜세요.'};
  if(!R.lead && fieldOnly) return {why:`남은 미이수자 ${sub.length}명이 <b>전원 현장직</b>인데 <b>Ⓑ 부서 독려메일이 꺼져 있습니다.</b>`,
    how:'Ⓑ 체크박스를 켜세요.'};
  return {why:'조건에 맞는 발송 건이 없습니다.', how:'아래 <b>조건 초기화</b>를 눌러보세요.'};
}
function renderMail(){
  // 화면의 체크박스는 항상 저장된 규칙을 따라갑니다(표시와 실제가 어긋나지 않도록).
  $('#mJobMgr').checked=!!ST.rules.mgr;
  $('#mJobField').checked=!!ST.rules.lead;
  const jobs=buildJobs();
  const a=jobs.filter(j=>j.type==='A'), b=jobs.filter(j=>j.type==='B');
  const noRcpt=jobs.filter(j=>j.needsFix);
  $('#mCount').textContent=`총 ${jobs.length}통 (Ⓐ${a.length} · Ⓑ${b.length}) · 대상 ${new Set(jobs.flatMap(j=>j.list.map(p=>p.emp))).size}명`;
  const card=j=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)">
    <div class="row"><span class="pill ${j.type==='A'?'p-brand':'p-warn'}">${j.type==='A'?'Ⓐ 개인':'Ⓑ 부서'}</span>
    <b>${esc(j.label)}</b><span class="pill p-bad">${j.list.length}명</span>
    ${j.via?`<span class="pill p-warn">${esc(j.via)}</span>`:''}
    <span class="pill p-mute">CC ${j.cc.length}</span></div>
    <div class="hint" style="margin-top:3px">${j.to.length? '→ '+j.to.map(x=>esc(x.name)+' '+esc(x.pos)).join(', ') : '⚠ 수신자 없음 — ④탭에서 조장·반장을 직접 추가하세요'}</div>
    </div>`;
  const many = jobs.length>30 && !$('#mAutoSend').checked;
  $('#mList').innerHTML = jobs.length
    ? (many?`<div class="warnbox" style="margin-bottom:9px"><b>⚠ ${jobs.length}통은 한 번에 보내기 어렵습니다.</b><br>검토 모드에서는 Outlook 창이 <b>통수만큼</b> 열려 PC가 멈출 수 있습니다.<br>위에서 <b>발송 담당(서무)</b>을 본인 상위부서로 선택해 나눠 보내세요.</div>`:'')
      + (noRcpt.length?`<div class="warnbox" style="margin-bottom:9px"><b>⚠ 조장·반장을 못 찾아 대체 발송되는 부서 ${noRcpt.length}곳</b> — ${noRcpt.map(j=>esc(j.label)).join(', ')}<br>
      해당 직책자가 이미 이수해 명단에 없습니다. <b>발송은 되지만</b> 담당자/관리자에게 대신 갑니다.
      ④탭에서 직책자 메일을 등록하면 다음부터 바로 나갑니다.</div>`:'')
      + (b.length?`<div class="hint" style="font-weight:700;margin:4px 0">Ⓑ 부서 독려메일 ${b.length}통</div>`+b.map(card).join(''):'')
      + (a.length?`<div class="hint" style="font-weight:700;margin:10px 0 4px">Ⓐ 관리직 개인메일 ${a.length}통</div>`+a.map(card).join(''):'')
    : (()=>{ const r=emptyReason();
        return `<div class="${r.done?'okbox':'warnbox'}" style="line-height:1.75">
          <b style="font-size:13.5px">${r.done?'✅ 발송할 대상이 없습니다':'⚠ 발송 목록이 비어 있는 이유'}</b><br>
          ${r.why}<br><span class="hint">${r.how}</span>
          ${r.done?'':'<div style="margin-top:10px"><button class="btn" id="btnMailReset">조건 초기화 — 전체 · 미이수 1과목 이상 · Ⓐ Ⓑ 모두 켜기</button></div>'}
        </div>`; })();
  const rst=$('#btnMailReset');
  if(rst) rst.onclick=()=>{
    ST.rules.mgr=1; ST.rules.lead=1; ST.rules.masterOnly=0; save();
    $('#mOwner').value=''; $('#mSubj').value='any';
    $('#mJobMgr').checked=true; $('#mJobField').checked=true;
    renderMail(); toast('조건을 초기화했습니다');
  };
  const j=b[0]||a[0];
  $('#mPreview').innerHTML = j? `<div class="hint" style="margin-bottom:8px"><b>제목:</b> ${esc(j.subject)}<br><b>받는사람:</b> ${esc(j.to.map(x=>x.email).join('; '))}<br><b>참조:</b> ${esc(j.cc.map(x=>x.email).join('; '))}</div>
    <div style="border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff;color:#222;overflow:auto">${bodyHtml(j)}</div>` : '<div class="hint">대상 없음</div>';
  return jobs;
}

/* ---------- CMD(배치) + VBScript 발송 패키지 ----------
   PowerShell을 쓸 수 없는 환경을 위해 bat -> cscript -> Outlook COM 경로를 사용합니다.
   VBS 안에 한글이 들어가면 인코딩 문제가 생기므로, 수신자/제목/본문은 전부
   UTF-8 외부 파일로 빼고 VBS 자체는 순수 ASCII로 유지합니다.               */
const VBS = `Option Explicit
' Sends the mails listed in maillist.txt through Outlook.
' Generated by the training tracker - do not edit by hand.
Dim fso, base, ol, ln, parts, n, total, autoSend, mail, att, body, lines, i
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(base & "\\maillist.txt") Then
  WScript.Echo "[ERROR] maillist.txt not found. Unzip all files into one folder first."
  WScript.Quit 1
End If

On Error Resume Next
Set ol = CreateObject("Outlook.Application")
If Err.Number <> 0 Then
  WScript.Echo "[ERROR] Cannot start Outlook. Run this on a PC with Outlook installed."
  WScript.Quit 1
End If
On Error GoTo 0

Function ReadUtf8(path)
  Dim s
  Set s = CreateObject("ADODB.Stream")
  s.Type = 2 : s.Charset = "utf-8" : s.Open
  s.LoadFromFile path
  ReadUtf8 = s.ReadText()
  s.Close
End Function

lines = Split(Replace(ReadUtf8(base & "\\maillist.txt"), vbCrLf, vbLf), vbLf)
autoSend = False
total = 0 : n = 0

For i = 0 To UBound(lines)
  ln = lines(i)
  If Len(Trim(ln)) > 0 Then
    parts = Split(ln, vbTab)
    If UBound(parts) = 0 Then
      If parts(0) = "AUTOSEND" Then autoSend = True
    ElseIf UBound(parts) >= 4 Then
      total = total + 1
      body = ""
      If fso.FileExists(base & "\\" & parts(4)) Then body = ReadUtf8(base & "\\" & parts(4))
      Set mail = ol.CreateItem(0)
      mail.To = parts(0)
      If parts(1) <> "" Then mail.CC = parts(1)
      mail.Subject = parts(2)
      mail.HTMLBody = body
      If parts(3) <> "" Then
        att = base & "\\" & parts(3)
        If fso.FileExists(att) Then
          mail.Attachments.Add att
        Else
          WScript.Echo "  (attachment missing: " & parts(3) & ")"
        End If
      End If
      If autoSend Then
        mail.Send
        WScript.Echo "[" & total & "] sent -> " & parts(0)
      Else
        mail.Display
        WScript.Echo "[" & total & "] opened -> " & parts(0)
      End If
      n = n + 1
    End If
  End If
Next

WScript.Echo ""
WScript.Echo "Done. " & n & " mail(s) processed."
If Not autoSend Then WScript.Echo "Check each Outlook window and press Send."
`;
const BAT = `@echo off
rem === Legal training reminder mailer (CMD only, no PowerShell) ===
cd /d "%~dp0"
if not exist "send_mail.vbs" (
  echo [ERROR] send_mail.vbs not found.
  echo Unzip ALL files into one folder, then run this file again.
  pause
  exit /b 1
)
echo.
echo  Opening Outlook windows... please wait.
echo.
cscript //nologo "%~dp0send_mail.vbs"
echo.
pause
`;
function u8(str, bom){
  const b=ENC.encode(str);
  if(!bom) return b;
  const r=new Uint8Array(3+b.length); r.set([0xEF,0xBB,0xBF]); r.set(b,3); return r;
}
function packDownload(){
  const jobs=renderMail().filter(j=>j.to.length);
  if(!jobs.length){
    const r=emptyReason();
    toast(r.done?'모두 이수 완료 — 보낼 대상이 없습니다':'발송 목록이 비어 있습니다 — 위 「2. 발송 목록」에 이유를 표시했습니다',4200);
    $('#mList').scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  const out=[], list=[];
  if($('#mAutoSend').checked) list.push('AUTOSEND');
  const blobs=[];
  jobs.forEach((j,i)=>{
    const bodyFile=`본문_${String(i+1).padStart(2,'0')}.htm`;
    out.push({name:bodyFile, data:u8('<html><head><meta charset="utf-8"></head><body>'+bodyHtml(j)+'</body></html>', true)});
    const att = j.attach ? j.file : '';
    if(att) blobs.push({name:att, blob:xlsxBlob([{name:'미이수자',rows:[HEAD,...j.list.map(toRow)]}])});
    // 탭 구분: 받는사람 / 참조 / 제목 / 첨부 / 본문파일  (탭·줄바꿈은 제거)
    const cell=v=>String(v).replace(/[\t\r\n]/g,' ');
    list.push([j.to.map(x=>x.email).join('; '), j.cc.map(x=>x.email).join('; '),
               cell(j.subject), att, bodyFile].map(cell).join('\t'));
  });
  out.push({name:'maillist.txt', data:u8(list.join('\r\n'), false)});
  out.push({name:'send_mail.vbs', data:u8(VBS, false)});
  out.push({name:'보내기.bat',   data:u8(BAT, false)});
  out.push({name:'읽어주세요.txt', data:u8(`법정의무교육 독려메일 발송 안내  (PowerShell 불필요 / CMD 방식)

[실행 방법]
 1) 이 ZIP 안의 파일을 전부 한 폴더에 압축 해제하세요. (ZIP 안에서 바로 실행하면 동작하지 않습니다)
 2) 보내기.bat 을 더블클릭하세요.
 3) Outlook 새 메일 창이 순서대로 열립니다. 내용 확인 후 [보내기]를 누르세요.

[안내 창이 뜰 때]
 - "Windows의 PC 보호" -> [추가 정보] -> [실행] 을 누르세요.
 - Outlook 접근 허용 창이 뜨면 [허용] 을 선택하세요.

[bat 이 실행되지 않을 때]
 시작 -> cmd 입력 -> 검은 창에서 압축 푼 폴더로 이동한 뒤
   cscript //nologo send_mail.vbs

[발송 내역]
 총 ${jobs.length}통
  - 관리직 개인메일 ${jobs.filter(j=>j.type==='A').length}통 (본인 + 팀장 참조)
  - 부서 독려메일   ${jobs.filter(j=>j.type==='B').length}통 (조장·반장 + 팀장 참조)
 대상 ${new Set(jobs.flatMap(j=>j.list.map(p=>p.emp))).size}명
 생성일 ${new Date().toLocaleString('ko-KR')}

[포함 파일]
 보내기.bat      실행 파일
 send_mail.vbs   Outlook 발송 로직
 maillist.txt    받는사람/참조/제목/첨부 목록
 본문_NN.htm     메일 본문
 메일첨부_*.xlsx 부서별 미이수자 명단

문의: 미래성장팀 이재용 매니저 (jason@teczen.kr)
`, true)});
  Promise.all(blobs.map(b=>b.blob.arrayBuffer())).then(bufs=>{
    blobs.forEach((b,i)=>out.push({name:b.name, data:new Uint8Array(bufs[i])}));
    dl(zipStore(out),`법정의무교육_독려메일_${today()}.zip`);
    toast(`${jobs.length}통 패키지 생성 — 압축을 풀고 보내기.bat 을 실행하세요`,3800);
  });
}
function mailtoOpen(){
  const jobs=buildJobs().filter(j=>j.to.length);
  const j=jobs[0];
  if(!j){toast('수신자가 지정된 발송 건이 없습니다');return;}
  const txt = j.type==='A'
    ? `안녕하세요, ${j.list[0].name} ${j.list[0].pos}님.\n\n법정의무교육 중 아래 과목이 미이수 상태입니다.\n- ${!j.list[0].h?'성희롱 예방교육\n':''}${!j.list[0].d?'- 장애인 인식개선교육\n':''}\n교육기간: ${START} ~ ${DEADLINE} (연내 전원 이수 필수)\n기간 내 이수 부탁드립니다.`
    : `안녕하세요, ${j.label} 조장·반장님.\n\n소속 인원 중 법정의무교육 미이수자가 ${j.list.length}명 남아 있습니다.\n교육기간: ${START} ~ ${DEADLINE} (연내 전원 이수 필수)\n\n[미이수 명단]\n`
      + j.list.map(p=>`- ${p.pos} ${p.name}(${p.emp}) : ${!p.h&&!p.d?'성희롱+장애인':(!p.h?'성희롱':'장애인')} 미이수`).join('\n')
      + `\n\n기간 내 이수 완료하도록 독려 부탁드립니다.`;
  location.href=`mailto:${encodeURIComponent(j.to.map(x=>x.email).join(';'))}?cc=${encodeURIComponent(j.cc.map(x=>x.email).join(';'))}&subject=${encodeURIComponent(j.subject)}&body=${encodeURIComponent(txt.slice(0,1800))}`;
  if(jobs.length>1) toast(`첫 번째 건만 열립니다. ${jobs.length}통 전부 보내려면 ZIP 방식을 쓰세요.`,3500);
}

/* ---------- todo checklist ---------- */
const TODO=[
 ['조장·반장 메일 등록','엔진조립2반(평택) 10명은 조장·반장이 이미 이수해 명단에 없어 대체 발송됩니다. ④탭 &lt;수신자 일괄 등록&gt;에 등록하면 바로 나갑니다.'],
 ['집체교육 참석자 반영','4~6월 셧다운 집체교육 참석자는 온라인 데이터에 없을 수 있습니다. 참석자 사번 목록을 관리자에게 전달하세요.'],
 ['신규입사자·퇴사자 반영 주기','매주 인사팀 인원변동 명단을 받아 관리자가 ③탭 &lt;인원 추가&gt;로 등록. 퇴사자는 별도 제외 처리 필요.'],
 ['2주 연속 미이수 부서 보고','②탭 이수율 낮은 순 정렬 화면을 그대로 실장/팀장 보고에 사용할 수 있습니다.'],
 ['개인정보·직장내 괴롭힘 과목','원본 파일에는 4과목이 있습니다. 나머지 2과목도 관리하려면 컬럼 추가가 가능합니다.'],
 ['이메일 정확도 점검','사번@teczen.kr 형태 계정이 다수입니다. 실제 수신되는 계정인지 1회 테스트 발송 권장.'],
 ['주간 백업 규칙','관리자가 반영 후 ⤓백업 → 공유폴더 저장. 브라우저 캐시 삭제 시 데이터가 사라집니다.'],
 ['최종 증빙 보관','이수 완료 후 수료증/이수자 명단을 3년간 보관해야 합니다(점검 대비).'],
];
function renderTodo(){
  const chk=ST.todo||{};
  $('#todoBox').innerHTML=TODO.map((t,i)=>`<label style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--line2);cursor:pointer">
    <input type="checkbox" data-todo="${i}" ${chk[i]?'checked':''}>
    <span><b style="${chk[i]?'text-decoration:line-through;opacity:.55':''}">${t[0]}</b><br><span class="hint">${t[1]}</span></span></label>`).join('');
  $$('#todoBox input').forEach(c=>c.onchange=()=>{ST.todo=ST.todo||{};ST.todo[c.dataset.todo]=c.checked;save();renderTodo();});
}
