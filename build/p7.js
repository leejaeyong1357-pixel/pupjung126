
/* ---------- 예시 보기 ---------- */
/* ---------- 사외교육 신청 가이드라인 ---------- */
let GUIDE_URL = "";      // 등록돼 있으면 이미지 주소, 없으면 빈 문자열

async function loadGuideMeta(){
  try{ const d=await apiCall("/api/guide-image/meta"); GUIDE_URL = d.exists ? "/api/guide-image?v="+d.updatedAt : ""; }
  catch(e){ GUIDE_URL=""; }
}
function guidelineModal(){
  const admin=isAdmin();
  openModal(`
  <div class="modal-h"><div><h2>사외교육 신청 가이드라인</h2>
    <p>교육계획을 등록하기 전에 확인해 주세요.</p></div>
    <button data-close aria-label="닫기">&times;</button></div>
  <div class="modal-b" id="guideBody">
    ${GUIDE_URL
      ? `<img class="guideimg" src="${esc(GUIDE_URL)}" alt="사외교육 신청 가이드라인">`
      : admin
        ? `<div class="guidedrop" id="guideUpload"><b>가이드라인 이미지를 등록해 주세요</b>
             <span>클릭해서 이미지를 고르면 모든 직원에게 바로 보입니다 · PNG · JPG (10MB 이하)</span></div>`
        : `<div class="emptystate" style="padding:38px 20px"><div class="ico">${IC.book}</div>
             <h3>아직 등록된 가이드라인이 없습니다</h3>
             <p>미래성장팀 이재용 매니저에게 문의해 주세요.</p></div>`}
    <input type="file" id="guideFile" accept="image/png,image/jpeg,image/webp" hidden>
  </div>
  <div class="modal-f">
    ${admin?`<button class="btn ghost sm left" id="guideUpload2" type="button">${GUIDE_URL?"이미지 교체":"이미지 등록"}</button>`:""}
    ${admin&&GUIDE_URL?`<button class="btn ghost sm" id="guideDel" type="button">삭제</button>`:""}
    <button class="btn" data-close type="button">확인</button>
  </div>`,"wide");
  const up=()=>$("#guideFile").click();
  const u1=$("#guideUpload"), u2=$("#guideUpload2");
  if(u1) u1.onclick=up;
  if(u2) u2.onclick=up;
  $("#guideFile").onchange=uploadGuide;
  const del=$("#guideDel"); if(del) del.onclick=deleteGuide;
}
async function uploadGuide(e){
  const f=e.target.files && e.target.files[0];
  if(!f) return;
  if(f.size > 10*1024*1024){ toast("10MB 이하 이미지만 등록할 수 있습니다.",4000); e.target.value=""; return; }
  $("#guideBody").innerHTML = `<div class="emptystate" style="padding:38px"><h3>올리는 중입니다…</h3></div>`;
  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      await apiCall("/api/guide-image",{method:"POST",body:{name:f.name,data:reader.result}});
      await loadGuideMeta(); closeModal(); guidelineModal(); toast("가이드라인 이미지를 등록했습니다.");
    }catch(err){ toast(err.message,4500); closeModal(); guidelineModal(); }
  };
  reader.onerror=()=>{ toast("이미지를 읽지 못했습니다.",4000); closeModal(); guidelineModal(); };
  reader.readAsDataURL(f);
}
function deleteGuide(){
  confirmModal("가이드라인 삭제","등록된 가이드라인 이미지를 삭제합니다.<br>직원들에게는 더 이상 보이지 않습니다.",
    "삭제", async()=>{
      try{ await apiCall("/api/guide-image",{method:"DELETE"}); await loadGuideMeta();
           toast("삭제했습니다."); }
      catch(e){ toast(e.message,4000); }
    }, true);
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
