
/* ---------- 렌더 ---------- */
function render(){
  const app=$("#app");
  document.body.classList.toggle("login-mode", !ME);
  if(!ME){ app.innerHTML=""; app.appendChild($("#tpl-login").content.cloneNode(true)); bindLogin(); return; }
  const sc=scopeOf(), vis=visibleRows(), rows=filtered(vis);
  const pend=vis.filter(r=>r.status==="pending" && canApprove(r)).length;
  app.innerHTML = topbar(sc,pend) + (VIEW==="admin" && isAdmin()
    ? `<div class="shell">${adminView(vis)}${pageFoot()}</div>`
    : `<div class="shell"><div class="grid2"><main>${planView(sc,vis,rows)}</main>` +
      `<aside class="rail">${guideRail()}</aside></div>${pageFoot()}</div>`);
  bindAll();
}

function topbar(sc,pend){
  const label = sc.kind==="admin" ? "전체 관리자"
              : sc.kind==="sil"   ? ME.dept+" 총괄"
              : sc.kind==="lead"  ? ME.dept+" 팀장" : ME.dept;
  /* 탭은 관리자 전용 <전체 현황> 하나뿐입니다.
     승인·반려는 메인 화면의 각 줄에서 바로 하고, 로고를 누르면 메인으로 돌아옵니다. */
  const tabs = isAdmin() ? [["admin","전체 현황",0]] : [];
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
  if(CLOSED) return `<div class="eyebrow closed"><span class="dot"></span>취합 마감<span class="sep">·</span><b>${esc(fmtDeadline())}</b></div>`;
  const urgent = n!==null && n<=7;
  return `<div class="eyebrow${urgent?" urgent":""}"><span class="dot"></span>계획 취합 중
    <span class="sep">${esc(fmtDeadline())} 마감</span><b>${n===0?"오늘 마감":"D-"+n}</b></div>`;
}

function planView(sc,vis,rows){
  const mine=vis.filter(r=>r.createdBy===ME.emp).length;
  const people=new Set(vis.map(r=>r.emp)).size;
  const scopeName = sc.kind==="admin" ? "전사" : ME.dept;
  const scopeNote =
      sc.kind==="admin" ? "전체 조직의 계획을 조회할 수 있어요."
    : sc.kind==="sil"   ? "산하 전체 팀의 계획을 조회할 수 있어요."
    : sc.kind==="lead"  ? "팀원들의 계획을 승인·반려할 수 있어요."
    :                     "소속 팀의 계획만 조회할 수 있어요.";
  const tabs=[["all","전체",vis.length],["mine","내가 등록한 계획",mine],
              ["pending","승인 대기",vis.filter(r=>r.status==="pending").length],
              ["approved","승인 확정",vis.filter(r=>r.status==="approved").length],
              ["rejected","반려",vis.filter(r=>r.status==="rejected").length]];
  return `
  <section class="hero">
    <div class="hero-in">
      <div class="hero-meta">${deadlineChip()}</div>
      <h1><span class="num">${YEAR}</span>년 사외직무교육 계획</h1>
      <p>내년에 필요한 배움, 지금 계획해 주세요.</p>
      <div class="hero-acts">
        <button class="btn" id="addBtn" ${CAN_WRITE?"":'disabled title="취합이 마감되었습니다"'}>${IC.plus} 교육 계획 추가</button>
      </div>
    </div>
  </section>

  <div class="kpis">
    <div class="kpi"><div class="lab">등록된 교육계획</div><div class="val">${vis.length}<small>건</small></div>
      <div class="sub">내가 등록한 계획 ${mine}건</div></div>
    <div class="kpi"><div class="lab">교육 참여 인원</div><div class="val">${people}<small>명</small></div>
      <div class="sub">중복 제외</div></div>
    <div class="kpi"><div class="lab">총 교육시간</div><div class="val">${won(sum(vis,"hours"))}<small>시간</small></div>
      <div class="sub">등록된 교육 기준 · 교육일수 ${won(sum(vis,"days"))}일</div></div>
    <div class="kpi accent"><div class="lab">예상 교육비</div><div class="val">${won(sum(vis,"cost"))}<small>원</small></div>
      <div class="sub">${YEAR}년 ${esc(scopeName)} 합계</div></div>
  </div>

  <div class="card">
    <div class="card-h"><h2>${esc(scopeName)} 교육계획<span class="count">${rows.length}</span></h2>
      <div class="right"><span class="scopenote">${IC.shield}${esc(scopeNote)}</span></div></div>
    <div class="tabrow">
      <div class="subtabs">${tabs.map(([k,t,n])=>
        `<button data-sub="${k}" class="${SUB===k?"on":""}">${t} <span class="num">${n}</span></button>`).join("")}</div>
      <div class="filters">
        ${sc.teams.length>1?`<select class="filt" id="fTeam"><option value="">전체 팀</option>${
          sc.teams.map(t=>`<option ${FTEAM===t?"selected":""}>${esc(t)}</option>`).join("")}</select>`:""}
        <select class="filt" id="fCat"><option value="">교육구분 전체</option>${
          CATEGORIES.map(c=>`<option ${FCAT===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
        <div class="searchwrap">${IC.search}<input id="q" value="${esc(Q)}" placeholder="이름 또는 교육과정 검색" aria-label="검색"></div>
      </div>
    </div>
    ${planTable(rows,vis)}
    <div class="card-foot">${IC.info} 교육 참여 전 소속 팀장의 승인이 필요합니다.</div>
  </div>`;
}

function pageFoot(){
  return `<footer class="pagefoot">
    <span>&copy; TECZEN. All rights reserved.</span>
    <span class="pf-contact">${IC.phone} 문의 · 미래성장팀 이재용 매니저 · <b class="num">055-280-1741</b></span>
  </footer>`;
}

function statusCell(r){
  const s=STATUS[r.status]||STATUS.pending;
  if(r.status==="rejected")
    return `<button class="chip c-no" data-rej="${r.id}" title="반려 사유 보기">${s.label} · 사유 보기</button>`;
  return `<span class="chip ${s.cls}">${s.label}</span>`;
}

/* 표 맨 위에 흐린 예시 한 줄. 합계에는 들어가지 않습니다. */
const EX_ROWS = [
  {jobType:"관리직",emp:"82211489",dept:"미래성장팀",grade:"M2",name:"이재용",
   category:"사외교육",org:"한국생산성본부",course:"AX 엔지니어링 교육",
   start:"2027-01-24",end:"2027-01-26",days:3,place:"서울",hours:24,cost:780000},
  {jobType:"관리직",emp:"82210465",dept:"미래성장팀",grade:"M5",name:"박동중",
   category:"사외교육",org:"한국능률협회",course:"프로젝트 리더십",
   start:"2027-05-20",end:"2027-05-21",days:2,place:"부산",hours:16,cost:550000},
];
function exampleRows(){
  return EX_ROWS.map(r=>`<tr class="exrow" title="작성 예시입니다. 실제 등록된 계획이 아닙니다.">
    <td class="ctr"><span class="exbadge">예시</span></td>
    <td class="ctr"><span class="chip c-mute">${esc(r.jobType)}</span></td>
    ${showEmp()?`<td class="num">${esc(r.emp)}</td>`:""}
    ${showDept()?`<td class="c-dept">${esc(r.dept)}</td>`:""}
    <td class="ctr num">${esc(r.grade)}</td><td class="nm">${esc(r.name)}</td>
    <td class="ctr"><span class="chip c-mute">${esc(r.category)}</span></td>
    <td class="c-org">${esc(r.org)}</td><td class="c-course">${esc(r.course)}</td>
    <td class="ctr num">${schedule(r)}</td><td class="ctr num">${r.days}일</td>
    <td class="c-place">${esc(r.place)}</td>
    <td class="rt num">${won(r.hours)}시간</td><td class="rt num">${won(r.cost)}</td>
    <td class="ctr"><span class="chip c-mute">승인 대기</span></td><td></td></tr>`).join("");
}

/* 한 화면에 들어오도록 역할별로 필요 없는 칸은 감춥니다.
   사번은 관리자만, 부서는 여러 팀을 보는 사람만 봅니다. */
const showEmp  = () => isAdmin();
const showDept = () => scopeOf().teams.length > 1;

function tableHead(){
  return `<tr>
    <th class="ctr w-no">순번</th><th class="ctr w-job">구분</th>
    ${showEmp()?'<th class="w-emp">사번</th>':""}
    ${showDept()?'<th class="w-dept">부서</th>':""}
    <th class="ctr w-gr">직급</th><th class="w-nm">성명</th>
    <th class="ctr w-cat">교육구분</th><th class="c-org">교육기관</th><th class="c-course">교육과정</th>
    <th class="ctr w-sch">교육일정</th><th class="ctr w-day">일수</th><th class="w-place">교육장소</th>
    <th class="rt w-hr">교육시간</th><th class="rt w-cost">교육비</th>
    <th class="ctr w-st">승인상태</th><th class="w-act"></th></tr>`;
}

function planTable(rows,vis){
  if(!rows.length) return `<div class="emptystate"><div class="ico">${IC.empty}</div>
    <h3>${vis.length?"조건에 맞는 교육계획이 없습니다":"첫 교육계획을 등록해 보세요"}</h3>
    <p>${vis.length?"필터나 검색어를 바꿔 보세요."
      :"교육과정과 예상 비용을 등록하면<br>연간 일정과 예산을 한눈에 확인할 수 있어요.<br><span class=\"exlead\">아래 흐린 줄이 작성 예시입니다.</span>"}</p>
    ${vis.length||!CAN_WRITE?"":`<button class="btn" id="addBtn2">${IC.plus} 교육 계획 추가</button>`}</div>
    <div class="tw"><table class="${showEmp()||showDept()?"tight":""}"><thead>${tableHead()}</thead><tbody>${exampleRows()}</tbody></table></div>`;
  return `<div class="tw"><table class="${showEmp()||showDept()?"tight":""}"><thead>${tableHead()}</thead><tbody>
    ${exampleRows()}
    ${rows.map((r,i)=>`<tr>
      <td class="ctr num">${i+1}</td>
      <td class="ctr"><span class="chip ${r.jobType==="생산직"?"c-mute":"c-blue"}">${esc(r.jobType)}</span></td>
      ${showEmp()?`<td class="num">${esc(r.emp)}</td>`:""}
      ${showDept()?`<td class="c-dept" title="${esc(r.dept)}">${esc(r.dept)}</td>`:""}
      <td class="ctr num">${esc(r.grade||"-")}</td>
      <td class="nm">${esc(r.name)}${r.emp===ME.emp?'<span class="me">나</span>':""}</td>
      <td class="ctr"><span class="chip ${r.category==="사내교육"?"c-mute":"c-blue"}">${esc(r.category)}</span></td>
      <td class="c-org" title="${esc(r.org)}">${esc(r.org)}</td>
      <td class="c-course" title="${esc(r.course)}">${esc(r.course)}</td>
      <td class="ctr num">${schedule(r)}</td>
      <td class="ctr num">${r.days}일</td>
      <td class="c-place" title="${esc(r.place)}">${esc(r.place)}</td>
      <td class="rt num">${won(r.hours)}시간</td><td class="rt num">${won(r.cost)}</td>
      <td class="ctr">${statusCell(r)}</td>
      <td><div class="rowacts">
        ${canApprove(r)&&r.status!=="approved"?`<button class="ibtn" data-ok="${r.id}" title="승인">승인</button>`:""}
        ${canApprove(r)&&r.status!=="rejected"?`<button class="ibtn danger" data-no="${r.id}" title="반려">반려</button>`:""}
        ${canEditRow(r)?`<button class="ibtn" data-edit="${r.id}" title="수정">수정</button>
                            <button class="ibtn danger" data-del="${r.id}" title="삭제">삭제</button>`:""}
      </div></td></tr>`).join("")}
    </tbody><tfoot><tr>
      <td colspan="${7+(showEmp()?1:0)+(showDept()?1:0)}" class="rt">합계 ${rows.length}건</td>
      <td class="ctr num">${won(sum(rows,"days"))}일</td><td></td>
      <td class="rt num">${won(sum(rows,"hours"))}시간</td>
      <td class="rt num">${won(sum(rows,"cost"))}</td><td colspan="2"></td>
    </tr></tfoot></table></div>`;
}

/* 스크롤을 따라다니는 우측 안내 배너. ㅡ 로 최소화됩니다. */
function guideRail(){
  const min = localStorage.getItem("teczen_guide_min")==="1";
  return `<div class="guide">
    <div class="guide-h">${IC.info}<h3>${YEAR}년 계획 등록 안내</h3>
      <button id="guideToggle" title="${min?"펼치기":"최소화"}" aria-label="${min?"안내 펼치기":"안내 접기"}">${min?"+":"\u2212"}</button></div>
    ${min?"":`<div class="guide-b">${GUIDE.map(([t,d,w,bad],i)=>
      `<div class="gitem${w?" warn":""}"><h4><span class="n">${i+1}</span>${esc(t)}</h4><p>${d}</p>
       ${bad?`<div class="badlist"><span class="badlab">신청 불가</span>${
         bad.map(x=>`<span class="badchip">${esc(x)}</span>`).join("")}</div>`:""}</div>`).join("")}
    </div>`}
  </div>`;
}
