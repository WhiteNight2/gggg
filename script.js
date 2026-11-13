// 처음 메뉴 (저장소를 쓰지 않으므로 새로고침하면 항상 이 목록으로 돌아옵니다)
const defaultMenus = {
  한식: ["김치찌개", "비빔밥", "치킨", "된장찌개", "제육볶음", "불고기"],
  양식: ["토마토 파스타", "크림 파스타", "피자", "햄버거", "스테이크"],
  중식: ["짜장면", "짬뽕", "탕수육", "마파두부"],
  일식: ["돈까스", "초밥", "라멘", "가츠동"],
  분식: ["떡볶이", "김밥", "순대", "라볶이"],
  아시아식: ["쌀국수", "팟타이", "나시고렝", "반미"],
  기타: [],
};
let menus = Object.entries(defaultMenus).flatMap(([category, names]) =>
  names.map((name) => ({ name, category }))
);
let lastPick = null;
let locked = false; // 추천이 돌아가는 동안 목록 변경 잠금

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const form = $("addForm");
const input = $("menuInput");
const pickBtn = $("pickBtn");
const list = $("menuList");
const resultEl = $("result");
const labelEl = $("stageLabel");
const messageEl = $("message");
const emptyGuide = $("emptyGuide");
const countEl = $("count");
const menuCategory = $("menuCategory");
const categoryFilter = $("categoryFilter");

for (const category of Object.keys(defaultMenus)) {
  menuCategory.add(new Option(category, category));
  categoryFilter.add(new Option(category, category));
}

function visibleMenus() {
  const category = categoryFilter.value;
  return category ? menus.filter((menu) => menu.category === category) : menus;
}

function showMessage(text, ok) {
  messageEl.textContent = text;
  messageEl.classList.toggle("ok", !!ok);
}

function setResult(text, state) {
  resultEl.textContent = text;
  resultEl.className = "stage-result " + state;
}

function showEmptyStage() {
  labelEl.textContent = "추천할 메뉴가 없어요";
  setResult("메뉴를 등록해 주세요", "idle");
}

function resetStage() {
  pickBtn.textContent = "메뉴 추천받기";
  if (visibleMenus().length === 0) {
    showEmptyStage();
    return;
  }
  labelEl.textContent = "오늘의 메뉴는";
  setResult("?", "idle");
}

function render() {
  list.textContent = "";
  const candidates = visibleMenus();
  candidates.forEach((menu) => {
    const { name, category } = menu;
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "name";
    span.textContent = name;
    const badge = document.createElement("small");
    badge.className = "menu-category";
    badge.textContent = category;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "del-btn";
    del.textContent = "×";
    del.setAttribute("aria-label", name + " 삭제");
    del.addEventListener("click", () => removeMenu(menu));
    li.append(span, badge, del);
    list.appendChild(li);
  });
  list.classList.toggle("locked", locked);
  categoryFilter.disabled = locked;
  countEl.textContent = "(" + candidates.length + "개)";
  emptyGuide.hidden = candidates.length > 0;
}

function fail(text) {
  showMessage(text, false);
  form.classList.remove("shake");
  void form.offsetWidth; // 애니메이션 재시작
  form.classList.add("shake");
  input.focus();
}

function addMenu() {
  if (locked) return;
  const name = input.value.trim().replace(/\s+/g, " ");
  if (!name) return fail("메뉴 이름을 입력해 주세요.");
  if (menus.some((menu) => menu.name.toLowerCase() === name.toLowerCase())) {
    return fail("'" + name + "'은(는) 이미 등록된 메뉴예요.");
  }
  const category = menuCategory.value;
  const wasEmpty = visibleMenus().length === 0;
  menus.push({ name, category });
  input.value = "";
  showMessage(category + "에 '" + name + "' 메뉴를 추가했어요.", true);
  if (wasEmpty) resetStage();
  render();
  input.focus();
}

function removeMenu(menu) {
  if (locked) return;
  menus = menus.filter((item) => item !== menu);
  if (lastPick === menu || visibleMenus().length === 0) resetStage();
  if (lastPick === menu) lastPick = null;
  showMessage("'" + menu.name + "' 메뉴를 삭제했어요.", true);
  render();
}

function confetti() {
  const box = document.createElement("div");
  box.className = "confetti";
  const colors = ["#ffd23f", "#e8432e", "#ffffff", "#7fd1a0"];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 130;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    p.style.setProperty("--rot", Math.random() * 540 - 270 + "deg");
    box.appendChild(p);
  }
  stage.appendChild(box);
  setTimeout(() => box.remove(), 1000);
}

function pickMenu() {
  if (locked) return;
  const candidates = visibleMenus();
  if (candidates.length === 0) {
    showEmptyStage();
    fail("선택한 목록에 메뉴가 없어요. 메뉴를 먼저 추가해 주세요.");
    return;
  }
  showMessage("");

  // 2개 이상이면 직전 추천과 다른 메뉴를 고름
  const pool = candidates.length > 1 ? candidates.filter((menu) => menu !== lastPick) : candidates;
  const final = pool[Math.floor(Math.random() * pool.length)];
  lastPick = final;

  locked = true;
  pickBtn.disabled = true;
  render();
  labelEl.textContent = "고르는 중...";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const steps = reduce ? 0 : 14;
  let i = 0;

  const finish = () => {
    labelEl.textContent = "오늘의 메뉴는";
    setResult(final.name, "done");
    if (!reduce) confetti();
    locked = false;
    pickBtn.disabled = false;
    pickBtn.textContent = "다시 추천받기";
    render();
  };

  const tick = () => {
    if (i >= steps) return finish();
    setResult(candidates[Math.floor(Math.random() * candidates.length)].name, "shuffling");
    i++;
    setTimeout(tick, 45 + i * 12); // 갈수록 느려지는 효과
  };
  tick();
}

form.addEventListener("submit", (e) => { e.preventDefault(); addMenu(); });
pickBtn.addEventListener("click", pickMenu);
categoryFilter.addEventListener("change", () => {
  if (categoryFilter.value) menuCategory.value = categoryFilter.value;
  showMessage("");
  resetStage();
  render();
});
render();
