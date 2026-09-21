
/* ---------- 이벤트 ---------- */
/* 로그인 성공 처리 */
function enterApp(d){
  applyBootstrap(d);
  VIEW="team"; SUB="all"; Q=""; FTEAM=""; FCAT=""; render();
  toast(ME.name+"님, 환영합니다. "+ME.dept+"으로 등록되었습니다.");
}

/* 팀장 · 실장은 이름 · 사번을 맞힌 뒤 생년월일 앞 6자리를 한 번 더 확인합니다.
   서버가 앞 6자리까지 받아야 로그인을 내주므로 이 창을 닫으면 들어갈 수 없습니다. */
function birthModal(name,emp){
  openModal(`
  <div class="modal-h"><div><h2>본인 확인</h2>
    <p>${esc(name)}님은 승인 권한이 있어 한 번 더 확인합니다.</p></div>
    <button data-close aria-label="닫기">&times;</button></div>
  <form class="modal-b bibox" id="birthForm">
    <div id="birthErr"></div>
    <label for="biNum">생년월일 앞 6자리</label>
    <input id="biNum" class="num binum" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="800101">
    <p class="bihint">주민등록번호 앞 6자리입니다. 뒷자리는 묻지 않습니다.</p>
  </form>
  <div class="modal-f">
    <button class="btn ghost" data-close type="button">취소</button>
    <button class="btn" id="biOk" type="button">확인</button>
  </div>`,"narrow");

  const err=m=>{ $("#birthErr").innerHTML=`<div class="loginerr">${esc(m)}</div>`; $("#biOk").disabled=false; };
  const go=async()=>{
    const birth=$("#biNum").value.trim().replace(/\D/g,"");
    if(birth.length!==6) return err("생년월일 앞 6자리를 여섯 자리로 입력해 주세요.");
    $("#biOk").disabled=true;
    try{
      const d=await apiCall("/api/login",{method:"POST",body:{name,emp,birth}});
      closeModal(); enterApp(d);
    }catch(ex){ err(ex.message); $("#biNum").select(); }
  };
  $("#biOk").onclick=go;
  $("#birthForm").addEventListener("submit",e=>{ e.preventDefault(); go(); });
  setTimeout(()=>$("#biNum") && $("#biNum").focus(),70);   // 닫기(×)가 아니라 입력칸에 커서
}

function bindLogin(){
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const btn=$("#loginForm button[type=submit]");
    const name=$("#liName").value.trim(), emp=$("#liEmp").value.trim().replace(/\D/g,"");
    const err=m=>{ $("#loginErr").innerHTML=`<div class="loginerr">${esc(m)}</div>`; btn.disabled=false; };
    if(!name||!emp) return err("성명과 사번을 모두 입력해 주세요.");
    btn.disabled=true;
    try{
      const d=await apiCall("/api/login",{method:"POST",body:{name,emp}});
      if(d.needBirth){ btn.disabled=false; return birthModal(d.name,emp); }
      enterApp(d);
    }catch(ex){ err(ex.message); }
  });
}
function bindAll(){
  $$(".mainnav button").forEach(b=>b.onclick=()=>{VIEW=b.dataset.view;SUB="all";Q="";render();});
  $$("[data-sub]").forEach(b=>b.onclick=()=>{SUB=b.dataset.sub;render();});
  const lo=$("#logoutBtn"); if(lo) lo.onclick=async()=>{
    try{ await apiCall("/api/logout",{method:"POST"}); }catch(e){}
    ME=null; ROWS=[]; render();
  };
  const th=$("#themeBtn"); if(th) th.onclick=toggleTheme;
  const gt=$("#guideToggle"); if(gt) gt.onclick=()=>{
    const min=localStorage.getItem("teczen_guide_min")==="1";
    try{ localStorage.setItem("teczen_guide_min",min?"0":"1"); }catch(e){}
    render();
  };
  [["#addBtn"],["#addBtn2"]].forEach(([s])=>{const b=$(s); if(b) b.onclick=()=>planForm(null);});
  const hb=$("#homeBtn"); if(hb) hb.onclick=()=>{VIEW="team";SUB="all";Q="";render();};
  const xb=$("#xlsxBtn"); if(xb) xb.onclick=exportXlsx;
  const ft=$("#fTeam"); if(ft) ft.onchange=()=>{FTEAM=ft.value;render();};
  const fc=$("#fCat");  if(fc) fc.onchange=()=>{FCAT=fc.value;render();};
  const q=$("#q");
  if(q){ q.oninput=()=>{clearTimeout(window._q);window._q=setTimeout(()=>{
    Q=q.value.trim(); const at=document.activeElement===q; render();
    if(at){const n=$("#q"); if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);} }},220);}; }
  const byId=id=>ROWS.find(r=>r.id===id);
  $$("[data-edit]").forEach(b=>b.onclick=()=>planForm(byId(b.dataset.edit)));
  $$("[data-rej]").forEach(b=>b.onclick=()=>reasonModal(byId(b.dataset.rej)));
  $$("[data-no]").forEach(b=>b.onclick=()=>rejectModal(byId(b.dataset.no)));
  $$("[data-ok]").forEach(b=>b.onclick=()=>{
    const r=byId(b.dataset.ok);
    confirmModal("교육 계획 승인",
      `<b>${esc(r.name)}</b>님의 <b>${esc(r.course)}</b> 계획을 승인합니다.<br>승인하면 등록자에게 승인 확정으로 표시됩니다.`,
      "승인 확정", async()=>{
        try{ await apiCall("/api/plans/"+r.id+"/approve",{method:"POST"});
             toast("승인 확정했습니다."); await refresh(); }
        catch(e){ toast(e.message,4000); }
      });
  });
  $$("[data-del]").forEach(b=>b.onclick=()=>{
    const r=byId(b.dataset.del);
    confirmModal("교육 계획 삭제",
      `<b>${esc(r.course)}</b> 계획을 삭제합니다.<br>삭제하면 되돌릴 수 없습니다.`,
      "삭제", async()=>{
        try{ await apiCall("/api/plans/"+r.id,{method:"DELETE"});
             toast("삭제했습니다."); await refresh(); }
        catch(e){ toast(e.message,4000); }
      }, true);
  });
}
function bindPlanForm(existing){
  const seg=$("#jobSeg"); let job=existing?existing.jobType:"관리직";
  $$("#jobSeg button").forEach(b=>b.onclick=()=>{
    job=b.dataset.job;
    $$("#jobSeg button").forEach(x=>x.classList.toggle("on",x.dataset.job===job));
    $("#mgrPick").hidden = job!=="관리직";
    $("#prdPick").hidden = job==="관리직";
  });
  const recalc=()=>{ $("#pfDays").textContent = daysBetween($("#pfStart").value,$("#pfEnd").value); };
  $("#pfStart").onchange=()=>{ const s=$("#pfStart").value,e=$("#pfEnd");
    if(s&&(!e.value||e.value<s)) e.value=s; recalc(); };
  $("#pfEnd").onchange=recalc;
  $("#pfSave").onclick=async()=>{
    const err=m=>{ $("#pfErr").innerHTML=`<div class="loginerr">${m}</div>`; };
    const g=id=>$(id).value.trim();
    let person;
    if(job==="관리직"){
      person=BY_EMP.get($("#pfPerson").value);
      if(!person) return err("대상자를 선택해 주세요.");
      person={emp:person.emp,name:person.name,dept:person.dept,grade:person.grade};
    }else{
      const emp=g("#pfEmp").replace(/\D/g,""), name=g("#pfName");
      if(!emp||!name) return err("생산직 대상자의 사번과 성명을 입력해 주세요.");
      person={emp,name,dept:$("#pfDept").value,grade:g("#pfGrade")||"생산직"};
    }
    const start=g("#pfStart"), end=g("#pfEnd");
    const org=g("#pfOrg"), course=g("#pfCourse"), place=g("#pfPlace");
    if(!org||!course||!place) return err("교육기관 · 교육과정 · 교육장소를 모두 입력해 주세요.");
    if(!start||!end) return err("교육 시작일과 종료일을 모두 선택해 주세요.");
    if(end<start) return err("종료일이 시작일보다 빠릅니다. 날짜를 다시 확인해 주세요.");
    if(start.slice(0,4)!=String(YEAR)||end.slice(0,4)!=String(YEAR))
      return err(`${YEAR}년 교육계획만 등록할 수 있습니다.`);
    const hours=Number(g("#pfHours").replace(/[^\d.]/g,""));
    const cost =Number(g("#pfCost").replace(/[^\d]/g,""));
    if(!(hours>0)) return err("교육시간을 시간 단위 숫자로 입력해 주세요.");
    if(!isFinite(cost)||cost<0) return err("교육비를 원 단위 숫자로 입력해 주세요. 비용이 없으면 0을 적습니다.");
    const payload={ jobType:job, emp:person.emp, name:person.name, dept:person.dept, grade:person.grade,
      category:$("#pfCat").value, org, course, start, end, place, hours, cost };
    $("#pfSave").disabled=true;
    try{
      if(existing) await apiCall("/api/plans/"+existing.id,{method:"PUT",body:payload});
      else         await apiCall("/api/plans",{method:"POST",body:payload});
      closeModal();
      toast(existing?"수정했습니다. 다시 승인 대기 상태가 됩니다.":"교육 계획을 등록했습니다. 팀장 승인을 기다려 주세요.",3400);
      await refresh();
    }catch(e){ err(e.message); $("#pfSave").disabled=false; }
  };
  recalc();
}

/* ---------- 테마 ---------- */
function toggleTheme(){
  const cur=document.documentElement.getAttribute("data-theme");
  const next = cur==="dark" ? "light" : cur==="light" ? "" : "dark";
  next ? document.documentElement.setAttribute("data-theme",next)
       : document.documentElement.removeAttribute("data-theme");
  try{ localStorage.setItem("teczen_theme",next); }catch(e){}
}
try{ const t=localStorage.getItem("teczen_theme"); if(t) document.documentElement.setAttribute("data-theme",t); }catch(e){}

/* ---------- 시작 ---------- */
render();
boot();
</script>
