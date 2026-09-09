
/* ---------- weekly update ---------- */
function parseIds(t){
  return [...new Set(t.split(/[\s,;\t]+/).map(x=>x.trim()).filter(Boolean))];
}
function resolve(tokens){
  const byEmp=new Map(PEOPLE.map(p=>[String(p.emp),p]));
  const byName=new Map(); PEOPLE.forEach(p=>{ if(!byName.has(p.name)) byName.set(p.name,[]); byName.get(p.name).push(p); });
  const hit=[], dup=[], miss=[];
  tokens.forEach(t=>{
    const e=t.replace(/[^0-9]/g,'');
    if(e && byEmp.has(e)) return hit.push(byEmp.get(e));
    if(byEmp.has(t)) return hit.push(byEmp.get(t));
    const n=byName.get(t);
    if(n && n.length===1) return hit.push(n[0]);
    if(n && n.length>1) return dup.push(t);
    miss.push(t);
  });
  return {hit:[...new Set(hit)], dup:[...new Set(dup)], miss};
}
function applyDone(preview){
  const subj=$$('input[name=subj]').find(r=>r.checked).value;
  const tk=parseIds($('#taPaste').value);
  if(!tk.length){toast('붙여넣은 내용이 없습니다');return;}
  const r=resolve(tk);
  const fields = subj==='both'?['h','d']:[subj];
  const changed=r.hit.filter(p=>fields.some(f=>!p[f]));
  const already=r.hit.length-changed.length;
  const nm={h:'성희롱',d:'장애인',both:'성희롱+장애인'}[subj];
  $('#applyResult').innerHTML = `
    <div class="${r.dup.length||r.miss.length?'warnbox':'okbox'}">
      <b>${preview?'미리보기':'반영 완료'}</b> — 과목: <b>${nm}</b><br>
      입력 ${tk.length}건 · 명단 매칭 <b>${r.hit.length}명</b> · 상태변경 <b>${changed.length}명</b> · 이미 이수 ${already}명
      ${r.dup.length?`<br>⚠ <b>동명이인 ${r.dup.length}건 미반영</b>: ${r.dup.map(esc).join(', ')} → 사번으로 다시 넣으세요`:''}
      ${r.miss.length?`<br>⚠ <b>명단에 없음 ${r.miss.length}건</b>: ${r.miss.slice(0,25).map(esc).join(', ')}${r.miss.length>25?' …':''} → 신규입사자면 아래 &lt;인원 추가&gt;로 등록`:''}
    </div>
    ${changed.length?`<div class="hint" style="margin-top:8px">변경 대상: ${changed.slice(0,60).map(p=>esc(p.name)+'('+esc(p.dept)+')').join(', ')}${changed.length>60?' …':''}</div>`:''}`;
  if(preview) return;
  if(!changed.length){toast('상태가 바뀐 인원이 없습니다');return;}
  const undo=[];
  changed.forEach(p=>{
    ST.done[p.emp]=ST.done[p.emp]||{};
    const before={...ST.done[p.emp]};
    fields.forEach(f=>ST.done[p.emp][f]=1);
    undo.push({emp:p.emp,before});
  });
  ST.hist.unshift({at:new Date().toISOString().slice(0,16).replace('T',' '), subj:nm, n:changed.length, undo});
  ST.hist=ST.hist.slice(0,50); save(); build(); refreshAll(); renderHist();
  toast(`${changed.length}명 ${nm} 이수 반영 완료`);
}
function renderHist(){
  $('#histBox').innerHTML = ST.hist.length
    ? `<table style="font-size:12px"><thead><tr><th>일시</th><th>과목</th><th>반영</th></tr></thead><tbody>`
      + ST.hist.map(h=>`<tr><td class="num">${esc(h.at)}</td><td>${esc(h.subj)}</td><td class="num">${h.n}명</td></tr>`).join('')
      + `</tbody></table>` : '<div class="hint">아직 반영 이력이 없습니다.</div>';
}

/* ---------- xlsx + zip ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const ENC=new TextEncoder();
function zipStore(files){
  const parts=[],cd=[];let off=0;
  files.forEach(f=>{
    const name=ENC.encode(f.name), data=f.data, c=crc32(data);
    const lh=new Uint8Array(30+name.length), dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);dv.setUint16(8,0,true);
    dv.setUint16(10,0,true);dv.setUint16(12,0x21,true);dv.setUint32(14,c,true);
    dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
    dv.setUint16(26,name.length,true);dv.setUint16(28,0,true);
    lh.set(name,30); parts.push(lh,data);
    const ch=new Uint8Array(46+name.length), cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
    cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0x21,true);cv.setUint32(16,c,true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
    cv.setUint32(42,off,true); ch.set(name,46); cd.push(ch);
    off+=lh.length+data.length;
  });
  let cdLen=0; cd.forEach(c=>cdLen+=c.length);
  const end=new Uint8Array(22), ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,cd.length,true);ev.setUint16(10,cd.length,true);
  ev.setUint32(12,cdLen,true);ev.setUint32(16,off,true);
  return new Blob([...parts,...cd,end],{type:'application/zip'});
}
function sheetXml(rows){
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  rows.forEach((r,ri)=>{
    x+=`<row r="${ri+1}">`;
    r.forEach((v,ci)=>{
      let col='',n=ci; do{col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)-1;}while(n>=0);
      const ref=col+(ri+1);
      if(typeof v==='number'&&isFinite(v)) x+=`<c r="${ref}"${ri===0?' s="1"':''}><v>${v}</v></c>`;
      else x+=`<c r="${ref}" t="inlineStr"${ri===0?' s="1"':''}><is><t xml:space="preserve">${esc(v??'')}</t></is></c>`;
    });
    x+='</row>';
  });
  return x+'</sheetData></worksheet>';
}
function xlsxBlob(sheets){
  const f=[];
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
   +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
   +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
   +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
   + sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
   +'</Types>';
  f.push({name:'[Content_Types].xml',data:ENC.encode(ct)});
  f.push({name:'_rels/.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
  f.push({name:'xl/workbook.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
   + sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>')});
  f.push({name:'xl/_rels/workbook.xml.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
   + sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')
   + `<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  f.push({name:'xl/styles.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
   +'<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts>'
   +'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills>'
   +'<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
   +'<cellXfs count="2"><xf xfId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1" xfId="0"/></cellXfs>'
   +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')});
  sheets.forEach((s,i)=>f.push({name:`xl/worksheets/sheet${i+1}.xml`,data:ENC.encode(sheetXml(s.rows))}));
  return new Blob([zipStore(f)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function dl(blob,name){
  const a=document.createElement('a'),u=URL.createObjectURL(blob);
  a.href=u;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},800);
}
const HEAD=['구분','이름','사번','직급','상위부서','부서','이메일','연락처','성희롱 이수여부','장애인 이수여부'];
const toRow=(p,i)=>[i+1,p.name,String(p.emp),p.pos,p.up,p.dept,p.email,p.tel,p.h?'이수':'미이수',p.d?'이수':'미이수'];
const today=()=>new Date().toISOString().slice(0,10).replace(/-/g,'');
const safe=s=>String(s).replace(/[\\\/:*?"<>|§]/g,'_');
