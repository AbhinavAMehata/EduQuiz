// EduQuiz - script.js
// Categories (10) with id used by OpenTDB and local color class
const CATEGORIES = [
  { id: 9, name: "General Knowledge", cls: "cat-general", desc: "Everyday facts & trivia." },
  { id: 18, name: "Science: Computers", cls: "cat-computer", desc: "Tech, programming and computers." },
  { id: 21, name: "Sports", cls: "cat-sports", desc: "All kinds of sports trivia." },
  { id: 23, name: "History", cls: "cat-history", desc: "Events of the past." },
  { id: 22, name: "Geography", cls: "cat-geography", desc: "Countries, maps and more." },
  { id: 17, name: "Science & Nature", cls: "cat-science", desc: "Biology, chemistry, natural world." },
  { id: 20, name: "Mythology", cls: "cat-myth", desc: "Gods, legends and myths." },
  { id: 11, name: "Entertainment: Film", cls: "cat-film", desc: "Movies & filmmaking." },
  { id: 12, name: "Entertainment: Music", cls: "cat-music", desc: "Music & artists." },
  { id: 15, name: "Entertainment: Video Games", cls: "cat-videogame", desc: "Games & consoles." }
];

// Level -> time per question (seconds). We increase time according to level as requested.
const LEVEL_TIMES = { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35 };

let state = {
  category: null,
  catClass: null,
  numQuestions: 10,
  level: 3,
  questions: [],
  index: 0,
  score: 0,
  timerId: null,
  timeLeft: 0
};

// DOM refs
const splash = document.getElementById("splash");
const home = document.getElementById("home");
const setup = document.getElementById("setup");
const quiz = document.getElementById("quiz");
const result = document.getElementById("result");

const categoriesGrid = document.getElementById("categories-grid");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

const chosenCatTitle = document.getElementById("chosen-cat-title");
const chosenCatDesc = document.getElementById("chosen-cat-desc");
const numInput = document.getElementById("num-questions");
const incQty = document.getElementById("inc-qty");
const decQty = document.getElementById("dec-qty");
const levelButtons = document.querySelectorAll(".level-btn");
const startQuizBtn = document.getElementById("start-quiz");
const setupBack = document.getElementById("setup-back");

const qIndexEl = document.getElementById("q-index");
const timerEl = document.getElementById("timer");
const questionText = document.getElementById("question-text");
const optionsWrap = document.getElementById("options-wrap");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const nextBtn = document.getElementById("next");
const finalText = document.getElementById("final-text");
const againBtn = document.getElementById("again");
const toHomeBtn = document.getElementById("to-home");

const skipSplash = document.getElementById("skip-splash");
const goSetupBtn = document.getElementById("go-setup");

// splash auto-advance after 10s
let splashTimeout = setTimeout(() => showHome(), 10000);
skipSplash.addEventListener("click", () => { clearTimeout(splashTimeout); showHome(); });

// build categories on home
function renderCategories() {
  categoriesGrid.innerHTML = "";
  CATEGORIES.forEach(c => {
    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:100%;">
        <div>
          <div class="category-title">${c.name}</div>
          <div class="category-sub">${c.desc}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;">
          <div style="font-size:12px;color:var(--muted)">Choose</div>
          <div style="height:12px"></div>
        </div>
      </div>
    `;
    card.addEventListener("click", () => chooseCategory(c));
    categoriesGrid.appendChild(card);
  });
}

// Local storage history
function loadHistory() {
  const raw = localStorage.getItem("eduquiz_history");
  const arr = raw ? JSON.parse(raw) : [];
  historyList.innerHTML = "";
  arr.slice().reverse().forEach(rec => {
    const li = document.createElement("li");
    li.textContent = `${rec.when} — ${rec.cat} — L${rec.level} — ${rec.score}/${rec.total}`;
    historyList.appendChild(li);
  });
}
function saveHistory(record) {
  const raw = localStorage.getItem("eduquiz_history");
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(record);
  localStorage.setItem("eduquiz_history", JSON.stringify(arr));
  loadHistory();
}
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear quiz history?")) {
    localStorage.removeItem("eduquiz_history");
    loadHistory();
  }
});

// when category chosen -> show setup
function chooseCategory(cat) {
  state.category = cat.id;
  state.catClass = cat.cls;
  chosenCatTitle.textContent = cat.name;
  chosenCatDesc.textContent = cat.desc;
  numInput.value = state.numQuestions;
  // remove existing level selection
  levelButtons.forEach(b => b.classList.remove("selected"));
  document.querySelector(`.level-btn[data-level="${state.level}"]`).classList.add("selected");

  showSetup();
}

// change quantity controls
incQty.addEventListener("click", () => {
  let v = Math.min(10, Number(numInput.value) + 1);
  numInput.value = v;
});
decQty.addEventListener("click", () => {
  let v = Math.max(1, Number(numInput.value) - 1);
  numInput.value = v;
});
numInput.addEventListener("change", () => {
  let v = Number(numInput.value);
  if (!v || v < 1) v = 1;
  if (v > 10) v = 10;
  numInput.value = v;
});

// level selection
levelButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    levelButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    state.level = Number(btn.dataset.level);
  });
});

// start quiz
startQuizBtn.addEventListener("click", () => {
  state.numQuestions = Math.min(10, Math.max(1, Number(numInput.value) || 10));
  let difficulty = "easy";
  if (state.level <= 2) difficulty = "easy";
  else if (state.level === 3) difficulty = "medium";
  else difficulty = "hard";

  fetchQuestions(state.category, difficulty, state.numQuestions).catch(err => {
    alert("Failed to fetch questions. Try again.");
    console.error(err);
  });
});

// go back from setup
setupBack.addEventListener("click", () => {
  showHome();
});

// next button (disabled because auto-advance happens)
nextBtn.addEventListener("click", () => {
  goNext();
});

// result screen actions
againBtn.addEventListener("click", () => {
  showSetup();
});
toHomeBtn.addEventListener("click", () => {
  showHome();
});

// pages show/hide
function showSplash(){ splash.style.display="flex"; home.style.display="none"; setup.style.display="none"; quiz.style.display="none"; result.style.display="none"; }
function showHome(){ splash.style.display="none"; home.style.display="flex"; setup.style.display="none"; quiz.style.display="none"; result.style.display="none"; }
function showSetup(){ splash.style.display="none"; home.style.display="none"; setup.style.display="flex"; quiz.style.display="none"; result.style.display="none"; }
function showQuiz(){ splash.style.display="none"; home.style.display="none"; setup.style.display="none"; quiz.style.display="flex"; result.style.display="none"; }
function showResult(){ splash.style.display="none"; home.style.display="none"; setup.style.display="none"; quiz.style.display="none"; result.style.display="flex"; }

// fetch and prepare questions
async function fetchQuestions(categoryId, difficulty, amount) {
  startQuizBtn.disabled = true;
  startQuizBtn.textContent = "Loading...";
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple`;
  const res = await fetch(url);
  const data = await res.json();
  startQuizBtn.disabled = false;
  startQuizBtn.textContent = "Start EduQuiz";

  const list = (data.results || []).map(item => {
    const options = shuffle([ ...item.incorrect_answers.map(decodeHTML), decodeHTML(item.correct_answer) ]);
    return {
      q: decodeHTML(item.question),
      options,
      correct: decodeHTML(item.correct_answer)
    };
  });

  if (!list.length) throw new Error("No questions returned");

  state.questions = list;
  state.index = 0;
  state.score = 0;

  const quizCard = document.getElementById("quiz-card");
  quizCard.className = "quiz-card " + (state.catClass || "");
  showQuiz();
  renderQuestion();
}

// render current question
function renderQuestion() {
  clearTimer();

  const curr = state.questions[state.index];
  questionText.innerHTML = curr.q;
  optionsWrap.innerHTML = "";

  state.timeLeft = LEVEL_TIMES[state.level] || 20;
  timerEl.textContent = `⏰ ${state.timeLeft}s`;
  state.timerId = setInterval(() => {
    state.timeLeft--;
    timerEl.textContent = `⏰ ${state.timeLeft}s`;
    if (state.timeLeft <= 0) {
      clearTimer();
      revealCorrectThenNext();
    }
  }, 1000);

  curr.options.forEach(opt => {
    const b = document.createElement("div");
    b.className = "option";
    b.tabIndex = 0;
    b.innerHTML = opt;
    b.addEventListener("click", () => selectOption(b, opt));
    optionsWrap.appendChild(b);
  });

  qIndexEl.textContent = `Q ${state.index + 1} / ${state.questions.length}`;
  scoreEl.textContent = `Score: ${state.score}`;
  feedbackEl.textContent = "";
  nextBtn.disabled = true; // keep disabled
}

// when an option clicked
function selectOption(btnEl, selectedText) {
  if (btnEl.classList.contains("selected") || btnEl.classList.contains("correct") || btnEl.classList.contains("wrong")) return;

  Array.from(optionsWrap.children).forEach(ch => ch.classList.remove("selected"));
  btnEl.classList.add("selected");

  Array.from(optionsWrap.children).forEach(ch => ch.style.pointerEvents = "none");

  clearTimer();

  const correct = state.questions[state.index].correct;
  if (selectedText === correct) {
    btnEl.classList.add("correct");
    feedbackEl.textContent = "Correct! ✅";
    state.score++;
    scoreEl.textContent = `Score: ${state.score}`;
  } else {
    btnEl.classList.add("wrong");
    feedbackEl.textContent = `Wrong — Correct: ${correct}`;
    Array.from(optionsWrap.children).forEach(ch => {
      if (ch.textContent === correct) ch.classList.add("correct");
    });
  }

  // wait 10 seconds before moving to next
  setTimeout(() => goNext(), 10000);
}

// reveal correct answer (when time runs out) then next
function revealCorrectThenNext() {
  const correct = state.questions[state.index].correct;
  Array.from(optionsWrap.children).forEach(ch => {
    ch.style.pointerEvents = "none";
    if (ch.textContent === correct) {
      ch.classList.add("correct");
    } else {
      ch.classList.add("wrong");
    }
  });
  feedbackEl.textContent = "Time's up! ⏰";
  // wait 10 seconds before moving to next
  setTimeout(() => goNext(), 10000);
}

// go to next question or finish
function goNext() {
  clearTimer();
  state.index++;
  if (state.index < state.questions.length) {
    renderQuestion();
  } else {
    finishQuiz();
  }
}

// finish
function finishQuiz() {
  const when = new Date().toLocaleString();
  const catName = CATEGORIES.find(c => c.id === state.category)?.name || "Category";
  const rec = { when, cat: catName, level: state.level, score: state.score, total: state.questions.length };
  saveHistory(rec);

  finalText.textContent = `Your score: ${state.score} / ${state.questions.length}`;
  showResult();
}

// utilities
function clearTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}
function shuffle(arr) {
  return arr.sort(()=>Math.random()-0.5);
}
function decodeHTML(html){
  const t = document.createElement("textarea");
  t.innerHTML = html;
  return t.value;
}

// initial wiring
function init() {
  renderCategories();
  loadHistory();
  showSplash();

  document.getElementById("go-setup")?.addEventListener("click", () => {
    clearTimeout(splashTimeout);
    showHome();
    window.scrollTo({top:0,behavior:"smooth"});
  });
}

init();
