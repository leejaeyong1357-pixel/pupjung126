
/* ---------- 이벤트 ---------- */
function bindLogin(){
  $("#loginForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("#liName").value.trim(), emp=$("#liEmp").value.trim().replace(/\D/g,"");
    const err=m=>{ $("#loginErr").innerHTML=`<div class="loginerr">${m}</div>`; };
    if(!name||!emp) return err("성명과 사번을 모두 입력해 주세요.");
    const p=BY_EMP.get(emp);
    if(!p) return err("사번 "+emp+" 을(를) 명단에서 찾을 수 없습니다. 사번을 다시 확인해 주세요.");
    if(p.name!==name) return err("사번과 성명이 일치하지 않습니다. 다시 확인해 주세요.");
    ME=p; saveMe(p); VIEW="team"; SUB="all"; Q=""; FTEAM=""; FCAT=""; render();
    toast(p.name+"님, 환영합니다. "+p.dept+"으로 등록되었습니다.");
  });
}
function bindAll(){
  $$(".mainnav button").forEach(b=>b.onclick=()=>{VIEW=b.dataset.view;SUB="all";Q="";render();});
  $$("[data-sub]").forEach(b=>b.onclick=()=>{SUB=b.dataset.sub;render();});
  const lo=$("#logoutBtn"); if(lo) lo.onclick=()=>{ME=null;saveMe(null);render();};
  const th=$("#themeBtn"); if(th) th.onclick=toggleTheme;
  const gt=$("#guideToggle"); if(gt) gt.onclick=()=>{
    const m=localStorage.getItem("teczen_guide_min")==="1";
    try{ localStorage.setItem("teczen_guide_min",m?"0":"1"); }catch(e){}
    render();
  };
  [["#addBtn"],["#addBtn2"]].forEach(([s])=>{const b=$(s); if(b) b.onclick=()=>planForm(null);});
  const ex=$("#exBtn"); if(ex) ex.onclick=exampleModal;
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
        const ok=await patchRow(r.id,{status:"approved",rejectReason:"",
          decidedBy:ME.name,decidedByEmp:ME.emp,decidedAt:new Date().toISOString()});
        if(ok) toast("승인 확정했습니다.");
      });
  });
  $$("[data-del]").forEach(b=>b.onclick=()=>{
    const r=byId(b.dataset.del);
    confirmModal("교육 계획 삭제",
      `<b>${esc(r.course)}</b> 계획을 삭제합니다.<br>삭제하면 되돌릴 수 없습니다.`,
      "삭제", async()=>{ if(await removeRow(r.id)) toast("삭제했습니다."); }, true);
  });
}
function bindPlanForm(existing){
  $$("[data-close]").forEach(b=>b.onclick=closeModal);
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
    const now=new Date().toISOString();
    const row={ id: existing?existing.id:uid(), year:YEAR, jobType:job,
      emp:person.emp, name:person.name, dept:person.dept, grade:person.grade,
      category:$("#pfCat").value, org, course, start, end, days:daysBetween(start,end),
      place, hours, cost, status:"pending", rejectReason:"",
      decidedBy:"", decidedByEmp:"", decidedAt:"",
      createdBy: existing?existing.createdBy:ME.emp,
      createdByName: existing?existing.createdByName:ME.name,
      createdAt: existing?existing.createdAt:now, updatedAt:now };
    $("#pfSave").disabled=true;
    const ok=await saveRow(row);
    if(ok){ closeModal(); toast(existing?"수정했습니다. 다시 승인 대기 상태가 됩니다.":"교육 계획을 등록했습니다. 팀장 승인을 기다려 주세요.",3400); }
    else $("#pfSave").disabled=false;
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
initDb();
</script>
