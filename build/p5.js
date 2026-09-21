
/* ---------- 렌더 ---------- */
function render(){
  const app=$("#app");
  document.body.classList.toggle("login-mode", !ME);
  if(!ME){ app.innerHTML=""; app.appendChild($("#tpl-login").content.cloneNode(true)); bindLogin(); return; }
  const sc=scopeOf(), vis=visibleRows(), rows=filtered(vis);
  const pend=vis.filter(r=>r.status==="pending" && canApprove(r)).length;
  app.innerHTML = topbar(sc,pend) + `<div class="shell"><main>${
      VIEW==="admin" && isAdmin() ? adminView(vis) : planView(sc,vis,rows)
    }</main><aside class="rail">${guideRail()}</aside></div>`;
  bindAll();
}

function topbar(sc,pend){
  const label = sc.kind==="admin" ? "전체 관리자"
              : sc.kind==="sil"   ? ME.dept+" 총괄"
              : sc.kind==="lead"  ? ME.dept+" 팀장" : ME.dept;
  const tabs=[["team", sc.kind==="member"?"우리 팀 교육계획":"소속 교육계획",0]];
  if(sc.kind!=="member") tabs.push(["appr","승인 관리",pend]);
  if(isAdmin()) tabs.push(["admin","전체 현황",0]);
  return `<header class="topbar"><div class="topbar-in">
    <button class="brand" id="homeBtn" title="메인 화면으로">
      <img src="${LOGO}" alt="TECZEN"><span class="sep"></span>
      <span class="app"><span class="num">27</span>년 사외직무교육 계획</span></button>
    <nav class="mainnav">${tabs.map(([k,t,n])=>
      `<button data-view="${k}" class="${VIEW===k?"on":""}">${esc(t)}${n?`<span class="n">${n}</span>`:""}</button>`).join("")}</nav>
    <div class="topright">
      <button class="iconbtn" id="themeBtn" title="화면 밝기 전환" aria-label="화면 밝기 전환">${IC.theme}</button>
      <div class="who"><div class="avatar">${esc(ME.name.slice(0,1))}</div>
        <div><div class="nm">${esc(ME.name)} ${esc(ME.position)}</div><div class="dp">${esc(label)}</div></div>
      </div>
      <button class="iconbtn" id="logoutBtn">${IC.out}<span>로그아웃</span></button>
    </div>
  </div>${OFFLINE?`<div class="banner">서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인한 뒤 새로고침해 주세요.</div>`
    :CLOSED?`<div class="banner"><b>${esc(fmtDeadline())} 취합이 마감되었습니다.</b> 추가 등록이나 수정이 필요하면 미래성장팀 이재용 매니저에게 문의해 주세요.</div>`:""}</header>`;
}

/* 마감까지 남은 날짜를 눈에 띄게 */
function deadlineChip(){
  const n=daysToDeadline();
  if(CLOSED) return `<div class="eyebrow closed"><span class="dot"></span>취합 마감 · ${esc(fmtDeadline())}</div>`;
  const urgent = n!==null && n<=7;
  return `<div class="eyebrow${urgent?" urgent":""}"><span class="dot"></span>계획 취합 중 · ${esc(fmtDeadline())}까지
    <b class="num">${n===0?"오늘 마감":"D-"+n}</b></div>`;
}

function planView(sc,vis,rows){
  const mine=vis.filter(r=>r.createdBy===ME.emp).length;
  const people=new Set(vis.map(r=>r.emp)).size;
  const scopeName = sc.kind==="admin" ? "전사" : sc.kind==="sil" ? ME.dept : ME.dept;
  const canAppr = vis.some(r=>canApprove(r));
  const tabs=[["all","전체",vis.length],["mine","내가 등록한 계획",mine],
              ["pending","승인 대기",vis.filter(r=>r.status==="pending").length],
              ["approved","승인 확정",vis.filter(r=>r.status==="approved").length],
              ["rejected","반려",vis.filter(r=>r.status==="rejected").length]];
  return `
  <div class="pagehead">
    <div>
      ${deadlineChip()}
      <h1><span class="num">${YEAR}</span>년 사외직무교육 계획</h1>
      <p>내년에 필요한 교육을 미리 등록하고, 소속 조직의 일정과 비용을 함께 확인하세요.</p>
    </div>
    <div class="acts">
      <button class="btn ghost" id="guideBtn">${IC.book} 사외교육 신청 가이드라인</button>
      <button class="btn" id="addBtn" ${CAN_WRITE?"":"disabled title=\"취합이 마감되었습니다\""}>${IC.plus} 교육 계획 추가</button>
    </div>
  </div>
  <div class="note">${IC.info}<div>${
      sc.kind==="admin" ? "전체 조직의 교육계획을 조회하고, <b>실별 · 팀별 집계</b>를 엑셀로 내려받을 수 있습니다."
    : sc.kind==="sil"   ? `<b>${esc(ME.dept)}</b> 산하 전체 팀의 교육계획입니다. 팀원들이 등록한 계획을 <b>승인하거나 반려</b>해 주셔야 합니다.`
    : sc.kind==="lead"  ? `<b>${esc(ME.dept)}</b> 팀원들이 등록한 교육계획을 <b>승인하거나 반려</b>해 주셔야 합니다. 승인해야 교육 참여가 확정됩니다.`
    : `<b>${esc(ME.dept)}</b>으로 자동 등록되며, 소속 팀의 교육계획만 조회할 수 있어요.`}</div></div>
  <div class="kpis">
    <div class="kpi"><div class="lab">등록된 교육계획</div><div class="val">${vis.length}<small>건</small></div>
      <div class="sub">내가 등록 ${mine}건</div></div>
    <div class="kpi"><div class="lab">교육 참여 인원</div><div class="val">${people}<small>명</small></div>
      <div class="sub">중복 제외</div></div>
    <div class="kpi"><div class="lab">총 교육시간</div><div class="val">${won(sum(vis,"hours"))}<small>시간</small></div>
      <div class="sub">교육일수 ${won(sum(vis,"days"))}일</div></div>
    <div class="kpi accent"><div class="lab">예상 교육비</div><div class="val">${won(sum(vis,"cost"))}<small>원</small></div>
      <div class="sub">${YEAR}년 ${esc(scopeName)} 합계</div></div>
  </div>
  <div class="card">
    <div class="card-h"><h2>${sc.kind==="member"?"우리 팀 교육계획":"소속 교육계획"}<span class="count">${rows.length}</span></h2>
      <div class="right">
        ${sc.teams.length>1?`<select class="filt" id="fTeam"><option value="">전체 팀</option>${
          sc.teams.map(t=>`<option ${FTEAM===t?"selected":""}>${esc(t)}</option>`).join("")}</select>`:""}
        <select class="filt" id="fCat"><option value="">교육구분 전체</option>${
          CATEGORIES.map(c=>`<option ${FCAT===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
        <div class="searchwrap">${IC.search}<input id="q" value="${esc(Q)}" placeholder="이름 또는 교육과정 검색" aria-label="검색"></div>
      </div></div>
    <div class="subtabs">${tabs.map(([k,t,n])=>
      `<button data-sub="${k}" class="${SUB===k?"on":""}">${t} <span class="num">${n}</span></button>`).join("")}</div>
    ${planTable(rows,vis)}
  </div>`;
}

function statusCell(r){
  const s=STATUS[r.status]||STATUS.pending;
  if(r.status==="rejected")
    return `<button class="chip c-no" data-rej="${r.id}" title="반려 사유 보기">${s.label} · 사유 보기</button>`;
  return `<span class="chip ${s.cls}">${s.label}</span>`;
}

/* 표 맨 위에 흐린 예시 한 줄. 합계에는 들어가지 않습니다. */
const EX_ROW = {jobType:"관리직",emp:"82211489",dept:"미래성장팀",grade:"M2",name:"이재용",
  category:"사외교육",org:"한국생산성본부",course:"AX 엔지니어링 교육",
  start:"2027-01-24",end:"2027-01-26",days:3,place:"서울",hours:24,cost:780000};
function exampleRow(){
  const r=EX_ROW;
  return `<tr class="exrow" title="작성 예시입니다. 실제 등록된 계획이 아닙니다.">
    <td class="ctr"><span class="exbadge">예시</span></td>
    <td class="ctr"><span class="chip c-mute">${esc(r.jobType)}</span></td>
    <td class="num">${esc(r.emp)}</td><td>${esc(r.dept)}</td><td class="num">${esc(r.grade)}</td>
    <td class="nm">${esc(r.name)}</td>
    <td><span class="chip c-mute">${esc(r.category)}</span></td>
    <td>${esc(r.org)}</td><td>${esc(r.course)}</td>
    <td class="ctr num">${esc(r.start)} ~ ${esc(r.end.slice(5))}</td>
    <td class="ctr num">${r.days}일</td><td>${esc(r.place)}</td>
    <td class="rt num">${won(r.hours)}시간</td><td class="rt num">${won(r.cost)}</td>
    <td class="ctr"><span class="chip c-mute">승인 대기</span></td><td></td></tr>`;
}
function planTable(rows,vis){
  if(!rows.length) return `<div class="emptystate"><div class="ico">${IC.empty}</div>
    <h3>${vis.length?"조건에 맞는 교육계획이 없습니다":"아직 등록된 교육계획이 없습니다"}</h3>
    <p>${vis.length?"필터나 검색어를 바꿔 보세요.":"내년에 참여할 교육을 미리 등록해 주세요. 아래 흐린 줄이 작성 예시입니다."}</p>
    ${vis.length||!CAN_WRITE?"":`<button class="btn" id="addBtn2">${IC.plus} 교육 계획 추가</button>`}</div>
    <div class="tw"><table><thead><tr>
      <th class="ctr">순번</th><th class="ctr">구분</th><th>사번</th><th>부서</th><th>직급</th><th>성명</th>
      <th>교육구분</th><th>교육기관</th><th>교육과정</th><th class="ctr">교육일정</th><th class="ctr">일수</th>
      <th>교육장소</th><th class="rt">교육시간</th><th class="rt">교육비(원)</th>
      <th class="ctr">승인상태</th><th></th></tr></thead><tbody>${exampleRow()}</tbody></table></div>`;
  return `<div class="tw"><table><thead><tr>
      <th class="ctr">순번</th><th class="ctr">구분</th><th>사번</th><th>부서</th><th>직급</th><th>성명</th>
      <th>교육구분</th><th>교육기관</th><th>교육과정</th>
      <th class="ctr">교육일정</th><th class="ctr">일수</th>
      <th>교육장소</th><th class="rt">교육시간</th><th class="rt">교육비(원)</th>
      <th class="ctr">승인상태</th><th></th></tr></thead><tbody>
    ${exampleRow()}
    ${rows.map((r,i)=>`<tr>
      <td class="ctr num">${i+1}</td>
      <td class="ctr"><span class="chip ${r.jobType==="생산직"?"c-mute":"c-blue"}">${esc(r.jobType)}</span></td>
      <td class="num">${esc(r.emp)}</td><td>${esc(r.dept)}</td><td class="num">${esc(r.grade||"-")}</td>
      <td class="nm">${esc(r.name)}${r.emp===ME.emp?'<span class="me">나</span>':""}</td>
      <td><span class="chip ${r.category==="사내교육"?"c-mute":"c-blue"}">${esc(r.category)}</span></td>
      <td>${esc(r.org)}</td><td>${esc(r.course)}</td>
      <td class="ctr num">${schedule(r)}</td>
      <td class="ctr num">${r.days}일</td><td>${esc(r.place)}</td>
      <td class="rt num">${won(r.hours)}시간</td><td class="rt num">${won(r.cost)}</td>
      <td class="ctr">${statusCell(r)}</td>
      <td><div class="rowacts">
        ${canApprove(r)&&r.status!=="approved"?`<button class="ibtn" data-ok="${r.id}" title="승인">승인</button>`:""}
        ${canApprove(r)&&r.status!=="rejected"?`<button class="ibtn danger" data-no="${r.id}" title="반려">반려</button>`:""}
        ${canEditRow(r)?`<button class="ibtn" data-edit="${r.id}" title="수정">수정</button>
                            <button class="ibtn danger" data-del="${r.id}" title="삭제">삭제</button>`:""}
      </div></td></tr>`).join("")}
    </tbody><tfoot><tr>
      <td colspan="10" class="rt">합계 ${rows.length}건</td>
      <td class="ctr num">${won(sum(rows,"days"))}일</td><td></td>
      <td class="rt num">${won(sum(rows,"hours"))}시간</td>
      <td class="rt num">${won(sum(rows,"cost"))}</td><td colspan="2"></td>
    </tr></tfoot></table></div>`;
}

function guideRail(){
  const min = localStorage.getItem("teczen_guide_min")==="1";
  return `<div class="guide">
    <div class="guide-h">${IC.info}<h3>${YEAR}년 계획 등록 안내</h3>
      <button id="guideToggle" aria-label="${min?"안내 펼치기":"안내 접기"}" title="${min?"펼치기":"최소화"}">${min?"+":"−"}</button></div>
    ${min?"":`<div class="guide-b">${GUIDE.map(([t,d,w],i)=>
      `<div class="gitem${w?" warn":""}"><h4><span class="n">${i+1}</span>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("")}</div>`}
  </div>${min?"":`<p class="railfoot">문의 · 미래성장팀 이재용 매니저</p>`}`;
}
