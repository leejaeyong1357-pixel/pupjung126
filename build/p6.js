
/* ---------- 관리자: 실별 · 팀별 집계 ---------- */
function adminView(vis){
  const sils=Object.keys(ORG);
  const bySil=sils.map(s=>{
    const teams=[s,...(ORG[s]||[])].filter(t=>TEAMS.includes(t));
    const rows=vis.filter(r=>teams.includes(r.dept));
    return {sil:s,teams,rows,
      teamRows:teams.map(t=>({team:t,rows:vis.filter(r=>r.dept===t)})).filter(x=>x.rows.length||true)};
  });
  const total=vis.length, cost=sum(vis,"cost");
  const maxCost=Math.max(1,...bySil.map(b=>sum(b.rows,"cost")));
  return `
  <div class="pagehead">
    <div><div class="eyebrow"><span class="dot"></span>전체 관리자</div>
      <h1><span class="num">${YEAR}</span>년 전사 교육계획 현황</h1>
      <p>실별 · 팀별 등록 현황과 예상 교육비를 한눈에 확인하고 엑셀로 내려받을 수 있습니다.</p></div>
    <div class="acts"><button class="btn ghost" id="exBtn">${IC.book} 예시 보기</button>
      <button class="btn" id="xlsxBtn">${IC.down} 엑셀 다운로드</button></div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="lab">전사 교육계획</div><div class="val">${total}<small>건</small></div>
      <div class="sub">승인 확정 ${vis.filter(r=>r.status==="approved").length}건 · 대기 ${vis.filter(r=>r.status==="pending").length}건</div></div>
    <div class="kpi"><div class="lab">교육 참여 인원</div><div class="val">${new Set(vis.map(r=>r.emp)).size}<small>명</small></div>
      <div class="sub">등록 부서 ${new Set(vis.map(r=>r.dept)).size}곳</div></div>
    <div class="kpi"><div class="lab">총 교육시간</div><div class="val">${won(sum(vis,"hours"))}<small>시간</small></div>
      <div class="sub">교육일수 ${won(sum(vis,"days"))}일</div></div>
    <div class="kpi accent"><div class="lab">예상 교육비</div><div class="val">${won(cost)}<small>원</small></div>
      <div class="sub">1건 평균 ${won(total?Math.round(cost/total):0)}원</div></div>
  </div>
  <div class="card"><div class="card-h"><h2>실별 현황</h2><div class="right">
      <span class="chip c-mute">막대 = 예상 교육비 비중</span></div></div>
    <div class="tw"><table><thead><tr><th>실</th><th class="ctr">팀</th><th class="ctr">계획</th>
      <th class="ctr">인원</th><th class="rt">교육시간</th><th class="rt">예상 교육비</th><th style="width:170px">비중</th></tr></thead>
      <tbody>${bySil.map(b=>{const c=sum(b.rows,"cost");return `<tr>
        <td class="nm">${esc(b.sil)}</td><td class="ctr num">${b.teams.length}</td>
        <td class="ctr num">${b.rows.length}</td><td class="ctr num">${new Set(b.rows.map(r=>r.emp)).size}</td>
        <td class="rt num">${won(sum(b.rows,"hours"))}</td><td class="rt num">${won(c)}</td>
        <td><div style="height:8px;background:var(--panel-3);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${(c/maxCost*100).toFixed(1)}%;background:var(--blue);border-radius:4px"></div></div></td>
        </tr>`;}).join("")}</tbody>
      <tfoot><tr><td>합계</td><td class="ctr num">${TEAMS.length}</td><td class="ctr num">${total}</td>
        <td class="ctr num">${new Set(vis.map(r=>r.emp)).size}</td>
        <td class="rt num">${won(sum(vis,"hours"))}</td><td class="rt num">${won(cost)}</td><td></td></tr></tfoot>
    </table></div></div>
  <div class="card"><div class="card-h"><h2>팀별 현황</h2>
      <div class="right"><span class="chip c-mute">계획이 없는 팀도 함께 표시</span></div></div>
    <div class="tw"><table><thead><tr><th>실</th><th>팀</th><th class="ctr">계획</th><th class="ctr">인원</th>
      <th class="ctr">승인 확정</th><th class="ctr">대기</th><th class="ctr">반려</th>
      <th class="rt">교육시간</th><th class="rt">예상 교육비</th></tr></thead><tbody>
      ${bySil.map(b=>b.teamRows.map(({team,rows})=>`<tr>
        <td style="color:var(--ink-3)">${esc(b.sil)}</td><td class="nm">${esc(team)}</td>
        <td class="ctr num">${rows.length||"-"}</td><td class="ctr num">${new Set(rows.map(r=>r.emp)).size||"-"}</td>
        <td class="ctr num">${rows.filter(r=>r.status==="approved").length||"-"}</td>
        <td class="ctr num">${rows.filter(r=>r.status==="pending").length||"-"}</td>
        <td class="ctr num">${rows.filter(r=>r.status==="rejected").length||"-"}</td>
        <td class="rt num">${won(sum(rows,"hours"))}</td><td class="rt num">${won(sum(rows,"cost"))}</td></tr>`).join("")).join("")}
      </tbody></table></div></div>
  <div class="card"><div class="card-h"><h2>전체 계획 목록</h2><span class="count">${vis.length}</span>
    <div class="right"><div class="searchwrap">${IC.search}<input id="q" value="${esc(Q)}" placeholder="이름 또는 교육과정 검색" aria-label="검색"></div></div></div>
    ${planTable(filtered(vis),vis)}</div>`;
}

/* ---------- 모달 ---------- */
function openModal(html,cls=""){
  $("#modalRoot").innerHTML=`<div class="scrim" id="scrim"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  const sc=$("#scrim");
  sc.addEventListener("mousedown",e=>{ if(e.target===sc) closeModal(); });
  document.addEventListener("keydown",escClose);
  const f=sc.querySelector("input,select,textarea,button");
  if(f) setTimeout(()=>f.focus(),40);
}
function closeModal(){ $("#modalRoot").innerHTML=""; document.removeEventListener("keydown",escClose); }
function escClose(e){ if(e.key==="Escape") closeModal(); }

/* 교육계획 추가 · 수정 */
function planForm(existing){
  const sc=scopeOf(ME);
  const editable = sc.kind==="member" ? [ME.dept] : sc.teams;
  const r = existing || {jobType:"관리직",dept:ME.dept,emp:ME.emp,name:ME.name,grade:ME.grade,
                         category:"직무전문",org:"",course:"",start:"",end:"",place:"",hours:"",cost:""};
  const teamMates = PEOPLE.filter(p=>editable.includes(p.dept)).sort((a,b)=>a.dept.localeCompare(b.dept)||a.name.localeCompare(b.name));
  openModal(`
  <div class="modal-h"><div><h2>${existing?"교육 계획 수정":"교육 계획 추가"}</h2>
    <p>${YEAR}년에 참여할 사외직무교육을 등록합니다. 등록 후 팀장 승인을 받아야 참여가 확정됩니다.</p></div>
    <button data-close aria-label="닫기">&times;</button></div>
  <form class="modal-b" id="planForm">
    <div class="frow c1"><div>
      <span class="flabel">구분</span>
      <div class="seg" id="jobSeg">
        <button type="button" data-job="관리직" class="${r.jobType==="관리직"?"on":""}">관리직</button>
        <button type="button" data-job="생산직" class="${r.jobType==="생산직"?"on":""}">생산직 (대리 등록)</button>
      </div>
      <p class="hint">생산직 인원의 교육계획은 담당 관리직이 대신 등록합니다.</p>
    </div></div>
    <div id="mgrPick" ${r.jobType==="생산직"?"hidden":""}>
      <div class="frow c1"><div><label for="pfPerson">대상자</label>
        <select id="pfPerson">${teamMates.map(p=>
          `<option value="${p.emp}" ${p.emp===r.emp?"selected":""}>${esc(p.name)} · ${esc(p.position)} · ${esc(p.dept)}</option>`).join("")}</select>
        <p class="hint">소속 조직의 관리직 명단에서 선택합니다.</p></div></div>
    </div>
    <div id="prdPick" ${r.jobType==="생산직"?"":"hidden"}>
      <div class="frow c3">
        <div><label for="pfEmp">사번</label><input id="pfEmp" class="num" inputmode="numeric" value="${esc(r.jobType==="생산직"?r.emp:"")}" placeholder="82210000"></div>
        <div><label for="pfName">성명</label><input id="pfName" value="${esc(r.jobType==="생산직"?r.name:"")}" placeholder="홍길동"></div>
        <div><label for="pfGrade">직급</label><input id="pfGrade" value="${esc(r.jobType==="생산직"?(r.grade||""):"")}" placeholder="기술사원 / 조장 등"></div>
      </div>
      <div class="frow c1"><div><label for="pfDept">부서</label>
        <select id="pfDept">${editable.map(t=>`<option ${t===r.dept?"selected":""}>${esc(t)}</option>`).join("")}</select></div></div>
    </div>
    <div class="frow">
      <div><label for="pfCat">교육구분</label><select id="pfCat">${CATEGORIES.map(c=>
        `<option ${c===r.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
      <div><label for="pfOrg">교육기관</label><input id="pfOrg" value="${esc(r.org)}" placeholder="한국생산성본부" required></div>
    </div>
    <div class="frow c1"><div><label for="pfCourse">교육과정</label>
      <input id="pfCourse" value="${esc(r.course)}" placeholder="생성형 AI 업무자동화" required></div></div>
    <div class="frow c3">
      <div><label for="pfStart">시작일</label><input type="date" id="pfStart" value="${esc(r.start)}" min="${YEAR}-01-01" max="${YEAR}-12-31" required></div>
      <div><label for="pfEnd">종료일</label><input type="date" id="pfEnd" value="${esc(r.end)}" min="${YEAR}-01-01" max="${YEAR}-12-31" required></div>
      <div><label for="pfPlace">교육장소</label><input id="pfPlace" value="${esc(r.place)}" placeholder="서울 / 온라인" required></div>
    </div>
    <div class="frow">
      <div><label for="pfHours">교육시간 (시간)</label><input id="pfHours" class="num" inputmode="numeric" value="${esc(r.hours)}" placeholder="16" required></div>
      <div><label for="pfCost">교육비 (원)</label><input id="pfCost" class="num" inputmode="numeric" value="${esc(r.cost)}" placeholder="480000" required></div>
    </div>
    <div class="calc"><span>교육일수는 시작일과 종료일로 자동 계산됩니다</span><span>교육일수 <b id="pfDays">${r.start?daysBetween(r.start,r.end):0}</b>일</span></div>
    <div id="pfErr" style="margin-top:13px"></div>
  </form>
  <div class="modal-f">
    <button class="btn ghost" data-close type="button">취소</button>
    <button class="btn" id="pfSave" type="button">${existing?"수정 저장":"등록하기"}</button>
  </div>`,"");
  bindPlanForm(existing);
}
