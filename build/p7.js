
/* ---------- 예시 보기 ---------- */
const SAMPLE=[
  ["관리직","82211489","미래성장팀","매니저","이재용","사외교육","한국생산성본부","AX 엔지니어링 교육","2027-01-24","2027-01-26",3,"서울",24,780000],
  ["관리직","82210465","미래성장팀","팀장","박동중","사외교육","한국능률협회","프로젝트 리더십","2027-05-20","2027-05-21",2,"부산",16,550000],
  ["생산직","82210588","PT생산1팀","조장","조효근","사내교육","동우열처리","분석기 사용법 및 가스 보정 실습","2027-03-16","2027-03-16",1,"본공장",4,0],
];
function exampleModal(){
  openModal(`
  <div class="modal-h"><div><h2>작성 예시</h2>
    <p>아래와 같이 한 줄에 한 건씩 등록합니다. 순번과 교육일수는 자동으로 매겨집니다.</p></div>
    <button data-close aria-label="닫기">&times;</button></div>
  <div class="modal-b">
    <div class="exnote"><b>예시 데이터입니다.</b> 실제 등록 내용이 아니며, 입력 형식을 보여주기 위한 표본입니다.</div>
    <p style="margin:0 0 14px;font-size:13px;color:var(--ink-2);line-height:1.8">
      첫 줄을 말로 풀면 이렇습니다.<br>
      <b style="color:var(--ink)">사번 82211489, 미래성장팀 매니저 이재용, 사외교육.
      기관은 한국생산성본부, 과정은 AX 엔지니어링 교육.
      2027년 1월 24일부터 26일까지 3일간, 서울에서 24시간, 비용 780,000원.</b></p>
    <div class="tw"><table><thead><tr><th class="ctr">순번</th><th class="ctr">구분</th><th>사번</th><th>부서</th>
      <th>직급</th><th>성명</th><th>교육구분</th><th>교육기관</th><th>교육과정</th>
      <th class="ctr">시작일</th><th class="ctr">종료일</th><th class="ctr">일수</th><th>교육장소</th>
      <th class="rt">교육시간</th><th class="rt">교육비(원)</th></tr></thead><tbody>
      ${SAMPLE.map((s,i)=>`<tr><td class="ctr num">${i+1}</td>
        <td class="ctr"><span class="chip ${s[0]==="생산직"?"c-mute":"c-blue"}">${s[0]}</span></td>
        <td class="num">${s[1]}</td><td>${s[2]}</td><td class="num">${s[3]}</td><td class="nm">${s[4]}</td>
        <td><span class="chip ${s[5]==="사내교육"?"c-mute":"c-blue"}">${s[5]}</span></td>
        <td>${s[6]}</td><td>${s[7]}</td><td class="ctr num">${s[8]}</td><td class="ctr num">${s[9]}</td>
        <td class="ctr num">${s[10]}일</td><td>${s[11]}</td><td class="rt num">${won(s[12])}시간</td>
        <td class="rt num">${won(s[13])}</td></tr>`).join("")}
    </tbody></table></div>
    <div style="margin-top:20px">
      ${[["교육구분","사외교육 또는 사내교육 중에서 고릅니다."],
         ["교육기관 · 교육과정","기관명과 과정명을 안내문에 적힌 그대로 입력합니다."],
         ["교육일정","시작일과 종료일을 고르면 교육일수가 자동으로 계산됩니다. 예를 들어 2027-01-24 ~ 2027-01-26 이면 3일입니다. 하루짜리 교육은 두 날짜를 같게 둡니다."],
         ["교육시간","수료증에 기재되는 이수 시간입니다. 일수가 아니라 시간 단위로 적습니다."],
         ["교육비","1인 기준 금액을 원 단위 숫자로만 적습니다. 사내교육처럼 비용이 없으면 0을 입력합니다."],
         ["생산직 대리 등록","생산직 인원은 담당 관리직이 구분을 생산직으로 바꾼 뒤 사번·성명·직급을 직접 입력합니다."]
        ].map(([t,d])=>`<div class="gitem"><h4>${t}</h4><p>${d}</p></div>`).join("")}
    </div>
  </div>
  <div class="modal-f"><button class="btn" data-close type="button">확인</button></div>`,"wide");
}

/* ---------- 반려 ---------- */
function rejectModal(row){
  openModal(`
  <div class="modal-h"><div><h2>교육 계획 반려</h2>
    <p>${esc(row.name)} · ${esc(row.course)}</p></div><button data-close aria-label="닫기">&times;</button></div>
  <div class="modal-b">
    <div class="field"><label for="rjReason">반려 사유</label>
      <textarea id="rjReason" rows="4" placeholder="예) 동일 과정이 사내교육으로 편성되어 있습니다. 2분기 사내과정으로 신청해 주세요."></textarea>
      <p class="hint">등록한 사람이 목록에서 사유를 확인할 수 있습니다. 어떻게 고치면 되는지 함께 적어 주세요.</p></div>
    <div id="rjErr"></div>
  </div>
  <div class="modal-f"><button class="btn ghost" data-close type="button">취소</button>
    <button class="btn no" id="rjSave" type="button">반려 처리</button></div>`,"narrow");
  $("#rjSave").onclick=async()=>{
    const v=$("#rjReason").value.trim();
    if(!v){ $("#rjErr").innerHTML=`<div class="loginerr">반려 사유를 입력해 주세요.</div>`; return; }
    $("#rjSave").disabled=true;
    try{
      await apiCall("/api/plans/"+row.id+"/reject",{method:"POST",body:{reason:v}});
      closeModal(); toast("반려 처리했습니다."); await refresh();
    }catch(e){ $("#rjErr").innerHTML=`<div class="loginerr">${esc(e.message)}</div>`; $("#rjSave").disabled=false; }
  };
}
function reasonModal(row){
  openModal(`
  <div class="modal-h"><div><h2>반려 사유</h2><p>${esc(row.course)}</p></div>
    <button data-close aria-label="닫기">&times;</button></div>
  <div class="modal-b"><div class="rejbox">${esc(row.rejectReason||"사유가 입력되지 않았습니다.")}
    <div class="who">${esc(row.decidedBy||"")} · ${esc((row.decidedAt||"").slice(0,10))}</div></div>
    <p class="hint" style="margin-top:12px">사유에 맞게 고친 뒤 <b>수정</b>하면 다시 승인 대기 상태가 됩니다.</p></div>
  <div class="modal-f">${canEditRow(row)?`<button class="btn" id="fixBtn" type="button">수정하기</button>`:""}
    <button class="btn ghost" data-close type="button">닫기</button></div>`,"narrow");
  const f=$("#fixBtn"); if(f) f.onclick=()=>{ closeModal(); planForm(row); };
}
function confirmModal(title,body,label,onYes,danger){
  openModal(`<div class="modal-h"><div><h2>${esc(title)}</h2></div><button data-close aria-label="닫기">&times;</button></div>
  <div class="modal-b"><p style="margin:0;color:var(--ink-2);line-height:1.7">${body}</p></div>
  <div class="modal-f"><button class="btn ghost" data-close type="button">취소</button>
    <button class="btn ${danger?"no":""}" id="cfYes" type="button">${esc(label)}</button></div>`,"narrow");
  $("#cfYes").onclick=async()=>{ $("#cfYes").disabled=true; await onYes(); closeModal(); };
}

/* ---------- 엑셀 ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;
  for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const ENC=new TextEncoder();
function zipStore(files){
  const parts=[],cd=[];let off=0;
  files.forEach(f=>{const name=ENC.encode(f.name),data=f.data,c=crc32(data);
    const lh=new Uint8Array(30+name.length),dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
    dv.setUint16(10,0,true);dv.setUint16(12,0x21,true);dv.setUint32(14,c,true);
    dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
    dv.setUint16(26,name.length,true);lh.set(name,30);parts.push(lh,data);
    const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
    cv.setUint16(12,0,true);cv.setUint16(14,0x21,true);cv.setUint32(16,c,true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
    cv.setUint32(42,off,true);ch.set(name,46);cd.push(ch);off+=lh.length+data.length;});
  let cdLen=0;cd.forEach(c=>cdLen+=c.length);
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,cd.length,true);ev.setUint16(10,cd.length,true);
  ev.setUint32(12,cdLen,true);ev.setUint32(16,off,true);
  return new Blob([...parts,...cd,end],{type:"application/zip"});
}
function sheetXml(rows){
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  rows.forEach((r,ri)=>{x+=`<row r="${ri+1}">`;
    r.forEach((v,ci)=>{let col="",n=ci;do{col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)-1;}while(n>=0);
      const ref=col+(ri+1), s=ri===0?' s="1"':"";
      if(typeof v==="number"&&isFinite(v)) x+=`<c r="${ref}"${s}><v>${v}</v></c>`;
      else x+=`<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(v??"")}</t></is></c>`;});
    x+="</row>";});
  return x+"</sheetData></worksheet>";
}
function xlsxBlob(sheets){
  const f=[],O="http://schemas.openxmlformats.org";
  f.push({name:"[Content_Types].xml",data:ENC.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${O}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`)});
  f.push({name:"_rels/.rels",data:ENC.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${O}/package/2006/relationships"><Relationship Id="rId1" Type="${O}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)});
  f.push({name:"xl/workbook.xml",data:ENC.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${O}/spreadsheetml/2006/main" xmlns:r="${O}/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`)});
  f.push({name:"xl/_rels/workbook.xml.rels",data:ENC.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${O}/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${O}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="${O}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  f.push({name:"xl/styles.xml",data:ENC.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${O}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3C77"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)});
  sheets.forEach((s,i)=>f.push({name:`xl/worksheets/sheet${i+1}.xml`,data:ENC.encode(sheetXml(s.rows))}));
  return zipStore(f);
}
async function exportXlsx(){
  const vis=visibleRows();
  if(!vis.length){ toast("내려받을 교육계획이 없습니다."); return; }
  const head=["순번","구분","사번","부서","직급","성명","교육구분","교육기관","교육과정",
              "시작일","종료일","일수","교육장소","교육시간","교육비(원)","승인상태","반려사유","등록자"];
  const plans=[head,...filtered(vis).map((r,i)=>[i+1,r.jobType,r.emp,r.dept,r.grade||"",r.name,r.category,r.org,r.course,
              r.start,r.end,Number(r.days)||0,r.place,Number(r.hours)||0,Number(r.cost)||0,
              (STATUS[r.status]||STATUS.pending).label,r.rejectReason||"",r.createdByName||""])];
  const silRows=[["실","팀 수","계획","인원","교육시간","예상 교육비(원)"]];
  Object.keys(ORG).forEach(s=>{const teams=[s,...(ORG[s]||[])].filter(t=>TEAMS.includes(t));
    const rs=vis.filter(r=>teams.includes(r.dept));
    silRows.push([s,teams.length,rs.length,new Set(rs.map(r=>r.emp)).size,sum(rs,"hours"),sum(rs,"cost")]);});
  const teamRows=[["실","팀","계획","인원","승인 확정","대기","반려","교육시간","예상 교육비(원)"]];
  Object.entries(ORG).forEach(([s,ts])=>[s,...ts].filter(t=>TEAMS.includes(t)).forEach(t=>{
    const rs=vis.filter(r=>r.dept===t);
    teamRows.push([s,t,rs.length,new Set(rs.map(r=>r.emp)).size,rs.filter(r=>r.status==="approved").length,
      rs.filter(r=>r.status==="pending").length,rs.filter(r=>r.status==="rejected").length,sum(rs,"hours"),sum(rs,"cost")]);}));
  const blob=xlsxBlob([{name:"교육계획",rows:plans},{name:"실별 집계",rows:silRows},{name:"팀별 집계",rows:teamRows}]);
  const filename=`${YEAR}년_사외직무교육계획_${new Date().toISOString().slice(0,10).replace(/-/g,"")}.xlsx`;
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000);
  toast("엑셀 파일을 내려받았습니다.");
}
