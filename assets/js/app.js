/* 위젯 렌더링 · 패널 · 투어 로직
   AI 에이전트 수족관 — 프로토타입
   데이터는 전부 예시이며 실제 API 연동은 없습니다. */

/* ═══ 상태 변수는 반드시 최상단 ═══ */
let si = 0, tourOn = false, autoT = null, hoverPin = null, activeSesh = "cc", tick = null;

const el = q => document.querySelector(q);
const scrim = document.getElementById("scrim");

const byId = id => A.find(a => a.id === id);
const mmss = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
const kor = s => s>=60 ? `약 ${Math.round(s/60)}분` : `약 ${s}초`;

/* ═══ 위젯 ═══ */
function podHTML(a){
  const w = a.work, running = a.state!=="idle" && w.elapsed!=null;
  const timeBlock = running
    ? `<div class="tline"><div class="tbar"><i style="width:${Math.min(100, w.elapsed/w.eta*100).toFixed(1)}%"></i></div>
         <div class="tt"><span>${mmss(w.elapsed)}</span><span>${mmss(w.eta)} 예상</span></div></div>`
    : `<div class="tline"><div class="tt" style="justify-content:center"><span>${w.last||"작업 없음"}</span></div></div>`;
  return `<div class="pod" data-s="${a.state}" data-id="${a.id}">
    <div class="art"><img src="${a.img}" alt="${a.name}">
      <span class="mood">${a.state==="work"?"···":a.state==="idle"?"z z":"!"}</span></div>
    <div class="nm"><i class="dot"></i>${a.name}</div>
    <div class="st">${a.task}</div>
    <div class="meter"><div class="bar2"><i style="width:${a.tok}%;background:${a.tok>55?"var(--full)":a.tok>20?"var(--half)":"var(--low)"}"></i></div><span class="pct">${a.tok}%</span></div>
    ${timeBlock}</div>`;
}
function renderPods(){
  el("#pods").innerHTML = A.map(podHTML).join("");
  el("#pods").querySelectorAll(".pod").forEach(p=>{
    p.onmouseenter = () => showHover(p.dataset.id);
    p.onmouseleave = () => { if(!hoverPin) hideHover(); };
    p.onclick = e => { e.stopPropagation(); openPanel(true); goTab("work"); renderSessions(p.dataset.id); };
  });
  if(hoverPin) markSel(hoverPin);
}
function markSel(id){
  el("#pods").querySelectorAll(".pod").forEach(p=>p.classList.toggle("sel", p.dataset.id===id));
}

/* ═══ 호버 상세 카드 ═══ */
function showHover(id){
  const a = byId(id), w = a.work, pod = el(`.pod[data-id="${id}"]`);
  const running = a.state!=="idle" && w.elapsed!=null;
  const left = running ? Math.max(0, w.eta - w.elapsed) : 0;
  const badge = a.state==="work" ? ["작업 중","rgba(53,201,168,.18)","var(--full)"]
              : a.state==="idle" ? ["쉬는 중","rgba(127,180,196,.16)","#9FC3CF"]
              : ["토큰 부족","rgba(232,163,61,.2)","var(--low)"];
  el("#hovIn").innerHTML = `
    <div class="hov-hd"><img src="${a.img}" alt="">
      <div><h4>${a.name}<span class="tagS" style="background:${badge[1]};color:${badge[2]}">${badge[0]}</span></h4>
        <p class="sm">${a.full}</p></div></div>
    <h5>${w.title}</h5>
    <p class="desc">${w.detail}</p>
    <div class="prog"><i style="width:${(w.done/w.total*100).toFixed(0)}%"></i></div>
    <div class="plabel"><span>${w.done} / ${w.total} ${w.unit}</span><span>${(w.done/w.total*100).toFixed(0)}%</span></div>
    <dl class="kv">
      <dt>진행 시간</dt><dd>${running ? mmss(w.elapsed)+" <em>경과</em>" : "—"}</dd>
      <dt>예상 완료</dt><dd>${running ? kor(left)+" 남음 <em>(총 "+mmss(w.eta)+")</em>" : "평균 "+kor(w.avg||0)+" <em>소요</em>"}</dd>
      <dt>남은 토큰</dt><dd style="color:${a.tok>20?"var(--ink)":"var(--low)"}">${a.tok}%</dd>
    </dl>
    ${w.caution ? `<div class="warn" style="margin:0 0 11px">${w.caution}</div>` : ""}
    <div class="log">${w.log.map(([t,x])=>`<div><time>${t}</time><span>${x}</span></div>`).join("")}</div>`;
  const top = pod.offsetTop + 250 + pod.offsetHeight/2;
  const h = el("#hov");
  h.style.top = Math.max(120, Math.min(top - 190, 900)) + "px";
  h.classList.add("on");
  markSel(id);
}
function hideHover(){ el("#hov").classList.remove("on"); markSel(null); }

renderPods();

/* ═══ 타이머 ═══ */
function startTick(){
  clearInterval(tick);
  tick = setInterval(()=>{
    let ch = false;
    A.forEach(a=>{
      if(a.state!=="idle" && a.work.elapsed!=null && a.work.elapsed < a.work.eta){ a.work.elapsed++; ch = true; }
    });
    if(ch){ renderPods(); if(hoverPin) showHover(hoverPin); }
  }, 1000);
}
startTick();

/* ═══ 패널 ═══ */
const panel = el("#panel"), tank = el("#tank");
function openPanel(on){ panel.classList.toggle("open", on); el("#chev").textContent = on?"›":"‹"; if(on) tank.classList.remove("hint"); }
tank.onclick = () => openPanel(!panel.classList.contains("open"));
function goTab(n){
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected", t.dataset.pane===n));
  document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on", p.id==="pane-"+n));
}
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>goTab(t.dataset.pane));

/* ═══ 통합 작업 ═══ */
function renderSessions(active=activeSesh, extraMsg=null){
  activeSesh = active;
  el("#seshList").innerHTML = A.map(a=>`
    <button class="sesh" data-id="${a.id}" aria-pressed="${a.id===active}">
      <img src="${a.img}" alt="">
      <span><span class="t1">${a.session.title}</span><br><span class="t2">${a.name} · ${a.session.meta}</span><br>
      <span class="badge" style="color:${a.session.bc};background:rgba(255,255,255,.07)">${a.session.badge}</span></span>
    </button>`).join("");
  el("#seshList").querySelectorAll(".sesh").forEach(b=>b.onclick=()=>renderSessions(b.dataset.id));
  const a = byId(active);
  el("#chatBox").innerHTML =
    (extraMsg ? `<p class="msg sys">${extraMsg}</p>` : "") +
    a.session.chat.map(([t,r])=> r==="u" ? `<p class="msg u"><b>나</b> · ${t}</p>` : `<p class="msg a">${t}</p>`).join("");
  el("#handoffBtns").innerHTML = A.filter(x=>x.id!==active).map(x=>
    `<button class="hbtn" data-to="${x.id}"><img src="${x.img}" alt="">${x.name}에게</button>`).join("");
  el("#handoffBtns").querySelectorAll(".hbtn").forEach(b=>b.onclick=()=>{
    const from = byId(activeSesh), to = byId(b.dataset.to);
    renderSessions(to.id, `${from.name} → ${to.name}로 넘겼습니다. 지금까지의 대화 요약 4줄과 수정된 파일 목록이 함께 전달되어, 처음부터 다시 설명할 필요가 없습니다.`);
  });
}
renderSessions();

/* ═══ 스탯 비교 ═══ */
function renderCmp(){
  el("#legend").innerHTML = A.map(a=>`<span><i style="background:${a.color}"></i>${a.name}</span>`).join("");
  el("#cmpCard").innerHTML = AXES.map(ax=>{
    const max = Math.max(...A.map(a=>a.stats[ax]));
    return `<div class="axis"><span>${ax}</span>${A.map(a=>{
      const v=a.stats[ax], top=v===max;
      return `<div class="cbar${top?" top":""}"><span class="who">${a.name}</span>
        <span class="track"><i style="width:${v}%;background:${a.color};opacity:${top?1:.55}"></i></span>
        <b>${v}${top?'<span class="crown">▲</span>':""}</b></div>`;}).join("")}</div>`;
  }).join("") + `<div class="src">출처 Artificial Analysis · 2026-08 측정. 다섯 축 중 코딩은 클코, 장문·속도·가격은 제미니가 앞섭니다. 어느 하나가 전부 우세하지 않기 때문에 종합 점수 대신 축별로만 표기합니다.</div>`;
}
renderCmp();

/* ═══ 자동 라우팅 ═══ */
const RECO = [
  { q:"이 PR 코드 리뷰해줘", who:"cc", axis:"코딩", val:94, eta:"6~8분", cost:"약 4,200 토큰",
    why:"코딩 축 94로 셋 중 가장 높습니다. 근거를 붙여 설명하는 성격이라 리뷰에 맞습니다." },
  { q:"프로모션 배너 12장 만들어줘", who:"gm", axis:"속도", val:88, eta:"3~4분", cost:"약 9,000 토큰",
    why:"이미지 생성과 속도 축에서 앞섭니다. 다만 지금 토큰이 9%라 오늘은 3장까지만 가능합니다." },
  { q:"논문 40쪽 요약해줘", who:"gm", axis:"장문", val:96, eta:"2~3분", cost:"약 12,000 토큰",
    why:"장문 처리 축이 96으로 가장 높습니다. 분량이 큰 문서에 유리합니다." },
  { q:"결제 실패 테스트 짜줘", who:"cx", axis:"속도", val:78, eta:"3~5분", cost:"약 3,100 토큰",
    why:"코딩 90에 속도 78로 균형이 좋고, 지금 대기 중이라 바로 시작할 수 있습니다." }
];
el("#recoChips").innerHTML = RECO.map((r,i)=>`<button class="chip" data-i="${i}">${r.q}</button>`).join("");
el("#recoChips").querySelectorAll(".chip").forEach(c=>c.onclick=()=>runReco(+c.dataset.i));
function runReco(i){
  const r = RECO[i], a = byId(r.who);
  el("#recoChips").querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed", +c.dataset.i===i));
  el("#recoResult").classList.remove("on"); el("#recoThink").classList.add("on");
  clearTimeout(runReco._t);
  runReco._t = setTimeout(()=>{
    el("#recoThink").classList.remove("on");
    el("#recoResult").innerHTML = `
      <div class="who2"><img src="${a.img}" alt=""><div><b>${a.name}</b>
        <div class="mini" style="margin-top:3px">${r.axis} ${r.val} · 이 축 1위</div></div></div>
      <p class="why">${r.why}</p>
      <div class="etaRow"><div>예상 소요 <b>${r.eta}</b></div><div>예상 사용량 <b>${r.cost}</b></div>
        <div>현재 상태 <b>${a.task}</b></div></div>`;
    el("#recoResult").classList.add("on");
  }, 900);
}

/* ═══ 비교 분석 ═══ */
function ccIdle(){
  el("#ccGrid").innerHTML = A.map(a=>`<div class="col"><h4><img src="${a.img}" alt="">${a.name}</h4>
    <div class="rt">대기</div><p class="spin">전송 버튼을 누르면 셋에게 동시에 전달됩니다.</p></div>`).join("");
  el("#ccVerdict").innerHTML = "";
}
ccIdle();
el("#ccSend").onclick = ()=>{
  el("#ccGrid").innerHTML = A.map(a=>`<div class="col"><h4><img src="${a.img}" alt="">${a.name}</h4>
    <div class="rt">응답 중…</div><p class="spin">답변을 기다리는 중</p></div>`).join("");
  el("#ccVerdict").innerHTML = "";
  const order = [[1,900],[2,1500],[0,2100]];
  order.forEach(([idx,ms])=>setTimeout(()=>{
    const a = A[idx], col = el("#ccGrid").children[idx];
    col.innerHTML = `<h4><img src="${a.img}" alt="">${a.name}</h4>
      <div class="rt">${a.cross.rt} 만에 응답 · ${a.stats["추론"]} 추론</div>
      <p>${a.cross.text}</p><button class="pick" data-id="${a.id}">이 답 채택</button>`;
    col.querySelector(".pick").onclick = e=>{
      el("#ccGrid").querySelectorAll(".pick").forEach(p=>p.setAttribute("aria-pressed", p===e.target));
    };
  }, ms));
  setTimeout(()=>{
    el("#ccVerdict").innerHTML = `
      <div class="agree"><span>합의도</span><span class="ab"><i style="width:82%"></i></span><b style="color:var(--ink)">82%</b></div>
      <div class="verdict">
        <div class="vsame"><b>셋이 같은 말</b>초기에는 직접 구현하지 말 것. 외부 결제 서비스로 시작해야 한다는 데 이견이 없습니다.</div>
        <div class="vdiff"><b>갈리는 지점</b>전환 시점입니다. 거래액을 기준으로 든 답과 인력 규모를 기준으로 든 답이 갈립니다.</div>
      </div>`;
  }, 2500);
};

/* ═══ 말투 ═══ */
function renderTone(id="cc"){
  el("#toneChips").innerHTML = A.map(a=>`<button class="chip" data-id="${a.id}" aria-pressed="${a.id===id}">${a.name} 말투</button>`).join("");
  el("#toneChips").querySelectorAll(".chip").forEach(c=>c.onclick=()=>renderTone(c.dataset.id));
  el("#toneBox").textContent = byId(id).tone;
}
el("#origBox").textContent = "원문 · " + ORIG;
el("#toggleOrig").onclick = ()=>{ const o=el("#origBox"); o.classList.toggle("on");
  el("#toggleOrig").textContent = o.classList.contains("on") ? "원문 접기" : "원문 그대로 보기"; };
renderTone();

/* ═══ 배율 ═══ */
const vp = el("#vp"), sc = el("#sc"); let mode = "fit";
function fit(){
  const k = mode==="fit" ? Math.min(1, vp.clientWidth/1920) : 1;
  sc.style.transform = `scale(${k})`; vp.style.height = (1200*k)+"px";
  el("#bFit").setAttribute("aria-pressed", mode==="fit");
  el("#bOne").setAttribute("aria-pressed", mode==="one");
  if(tourOn) place();
}
el("#bFit").onclick=()=>{mode="fit";fit()}; el("#bOne").onclick=()=>{mode="one";fit()};
fit(); addEventListener("resize", fit);

/* ═══ 투어 ═══ */
const tour=el("#tour"), hole=el("#hole"), tip=el("#tip");
const STEPS = [
 { t:"화면 끝에 붙어 삽니다", sel:"#tank",
   b:"폭 100px 수조가 화면 오른쪽 가장자리에 상주합니다. 창을 새로 띄우지 않아도 세 마리 상태가 항상 보입니다.",
   before(){ openPanel(false); hoverPin=null; hideHover(); } },
 { t:"AI마다 이름과 얼굴이 있습니다", sel:'.pod[data-id="cc"] .art',
   b:"Claude Code는 클코, Codex는 덱스, Gemini는 제미니로 부릅니다. 모델명 대신 이름으로 기억하게 만드는 것이 출발점입니다." },
 { t:"표정이 상태를 말해 줍니다", sel:'.pod[data-id="cc"]',
   b:"일하면 색이 선명하고 점 세 개가 뜹니다. 쉬면 색이 빠지고, 토큰이 바닥나면 기울어집니다. 아래 버튼으로 바꿔 보세요.",
   extra:[["작업 중","work"],["쉬는 중","idle"],["지침","tired"]], onExtra(v){ setState("cc", v); } },
 { t:"체력바와 시계가 함께 돕니다", sel:'.pod[data-id="gm"]',
   b:"위쪽 바는 남은 토큰, 아래 바는 시간입니다. 제미니는 2분 8초째 작업 중이고 3분 10초쯤 끝날 예정이며 토큰은 9%뿐입니다.",
   before(){ setState("cc","work"); } },
 { t:"마우스를 올리면 펼쳐집니다", sel:"#hov",
   b:"캐릭터에 커서를 올리면 지금 무슨 일을 어디까지 했는지, 얼마나 걸렸고 얼마나 남았는지가 한 카드에 나옵니다. 최근 로그도 함께 봅니다.",
   before(){ openPanel(false); hoverPin="cc"; showHover("cc"); } },
 { t:"세 서비스를 한 창에서", sel:"#pane-work",
   b:"각 AI 사이트에 따로 접속하지 않습니다. 세션 목록에서 고르면 그 AI의 대화로 바로 넘어갑니다.",
   before(){ hoverPin=null; hideHover(); openPanel(true); goTab("work"); renderSessions("cc"); } },
 { t:"대화를 통째로 넘깁니다", sel:"#handoffBtns",
   b:"맥락을 다시 설명하는 일이 가장 큰 낭비입니다. 넘기기를 누르면 지금까지의 요약과 수정된 파일 목록이 함께 전달됩니다.",
   before(){ openPanel(true); goTab("work"); },
   extra:[["덱스에게 넘겨보기","cx"]],
   onExtra(v){ renderSessions(v, `클코 → ${byId(v).name}로 넘겼습니다. 지금까지의 대화 요약 4줄과 수정된 파일 목록이 함께 전달되어, 처음부터 다시 설명할 필요가 없습니다.`); } },
 { t:"능력치를 셋이 나란히", sel:"#cmpCard",
   b:"다섯 축을 한 화면에서 비교합니다. 축마다 1위가 달라 종합 순위는 매기지 않고, 각 축의 선두만 표시합니다.",
   before(){ openPanel(true); goTab("stat"); } },
 { t:"할 일을 적으면 담당을 정합니다", sel:"#pane-reco",
   b:"작업 유형을 판별해 그 축에서 가장 강한 캐릭터를 부릅니다. 예상 소요 시간과 사용량까지 미리 알려 줍니다.",
   before(){ openPanel(true); goTab("reco"); setTimeout(()=>runReco(0), 350); } },
 { t:"같은 질문을 셋에게 동시에", sel:"#pane-cross",
   b:"한 번의 전송으로 세 답변을 받아 응답 시간과 함께 늘어놓습니다. 합의도와 갈리는 지점을 계산해 어느 쪽을 믿을지 판단을 돕습니다.",
   before(){ openPanel(true); goTab("cross"); ccIdle(); setTimeout(()=>el("#ccSend").click(), 400); } },
 { t:"말투만 캐릭터에 맞춥니다", sel:"#pane-tone",
   b:"같은 내용을 성격에 맞게 읽어 주되 사실은 건드리지 않습니다. 기본값은 꺼짐이고 원문은 항상 함께 보관합니다.",
   before(){ openPanel(true); goTab("tone"); renderTone("gm"); } },
 { t:"여기까지입니다", sel:"#tank",
   b:"이제 자유롭게 눌러 보세요. 상단의 실제 크기 버튼을 누르면 위젯이 실제 화면에서 차지하는 크기 그대로 보입니다.",
   before(){ openPanel(true); goTab("work"); } }
];
function setState(id, state){
  const a = byId(id);
  a.state = state;
  a.task = state==="work" ? "코드 리뷰 중" : state==="idle" ? "대기 중" : "토큰 부족";
  a.tok = state==="tired" ? 6 : state==="work" ? 68 : 41;
  if(state==="idle"){ a.work.elapsed = null; a.work.last = "방금 완료"; }
  else if(a.work.elapsed==null){ a.work.elapsed = 252; }
  renderPods();
}
function place(){
  const s = STEPS[si], t = document.querySelector(s.sel);
  if(!t) return;
  const r = t.getBoundingClientRect(), pad = 8;
  hole.style.top=(r.top-pad)+"px"; hole.style.left=(r.left-pad)+"px";
  hole.style.width=(r.width+pad*2)+"px"; hole.style.height=(r.height+pad*2)+"px";
  const tw=348, th=tip.offsetHeight||240;
  let L = r.left - tw - 22; if(L < 14) L = Math.min(r.right + 22, innerWidth - tw - 14);
  let T = r.top + r.height/2 - th/2; T = Math.max(14, Math.min(T, innerHeight - th - 14));
  tip.style.left=L+"px"; tip.style.top=T+"px";
}
function render(){
  const s = STEPS[si];
  s.before && s.before();
  el("#tStep").textContent = `${si+1}단계`;
  el("#tTitle").textContent = s.t; el("#tBody").textContent = s.b;
  const ex = el("#tExtra"); ex.innerHTML = "";
  if(s.extra) s.extra.forEach(([label,val])=>{
    const b=document.createElement("button"); b.textContent=label;
    b.onclick=()=>{ s.onExtra(val); ex.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", x===b)); setTimeout(place,60); };
    ex.appendChild(b);
  });
  el("#tPg").textContent = `${si+1} / ${STEPS.length}`;
  el("#tPrev").style.visibility = si===0 ? "hidden" : "visible";
  el("#tNext").textContent = si===STEPS.length-1 ? "끝내기" : "다음";
  setTimeout(place, 420);
}
function startTour(){ tourOn=true; si=0; tour.hidden=false; scrim.hidden=true; render(); }
function endTour(){ tourOn=false; tour.hidden=true; hoverPin=null; hideHover(); stopAuto(); }
function next(){ if(si<STEPS.length-1){ si++; render(); } else endTour(); }
el("#tNext").onclick=next;
el("#tPrev").onclick=()=>{ if(si>0){ si--; render(); } };
el("#tSkip").onclick=endTour;
el("#bTour").onclick=startTour;
function startAuto(){ startTour(); el("#autoflag").classList.add("on"); clearInterval(autoT);
  autoT=setInterval(()=>{ if(si>=STEPS.length-1){ stopAuto(); return; } si++; render(); }, 5400); }
function stopAuto(){ clearInterval(autoT); autoT=null; el("#autoflag").classList.remove("on"); }
el("#bAuto").onclick=startAuto; el("#autoStop").onclick=stopAuto;
[el("#tNext"),el("#tPrev"),el("#tSkip")].forEach(b=>b.addEventListener("click", stopAuto));

el("#goTour").onclick=startTour;
el("#goAuto").onclick=()=>{ scrim.hidden=true; startAuto(); };
el("#goFree").onclick=()=>{ scrim.hidden=true; };
addEventListener("scroll", ()=>{ if(tourOn) place(); }, true);
addEventListener("keydown", e=>{
  if(!tourOn) return;
  if(e.key==="ArrowRight"||e.key==="Enter"){ stopAuto(); next(); }
  if(e.key==="ArrowLeft"){ stopAuto(); if(si>0){si--;render();} }
  if(e.key==="Escape") endTour();
});
