
import { auth, db, authReady } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const screens = document.querySelectorAll(".screen");

function showScreen(id) {
  screens.forEach(screen => screen.classList.remove("active"));
  $(id)?.classList.add("active");
  window.scrollTo(0, 0);
}

const questions = [
  ["She ___ to school every day.", ["go", "goes", "going", "gone"], 1],
  ["They ___ playing cricket.", ["is", "am", "are", "be"], 2],
  ["I ___ my homework yesterday.", ["complete", "completed", "completing", "completes"], 1],
  ["He is ___ honest boy.", ["a", "an", "the", "no article"], 1],
  ["The opposite of 'ancient' is ___.", ["old", "modern", "past", "historic"], 1],
  ["Choose the correct spelling.", ["Beautifull", "Beutiful", "Beautiful", "Beautifal"], 2],
  ["She has lived here ___ 2020.", ["for", "since", "from", "by"], 1],
  ["The plural of 'child' is ___.", ["childs", "childes", "children", "childrens"], 2],
  ["Choose the synonym of 'happy'.", ["sad", "angry", "joyful", "weak"], 2],
  ["If I ___ rich, I would help others.", ["am", "was", "were", "be"], 2],
  ["The book ___ by the teacher.", ["was written", "wrote", "write", "writing"], 0],
  ["Neither Ram nor Shyam ___ present.", ["are", "were", "is", "be"], 2],
  ["She speaks English ___.", ["fluent", "fluently", "fluency", "more fluent"], 1],
  ["Choose the antonym of 'brave'.", ["courageous", "bold", "cowardly", "strong"], 2],
  ["I have ___ umbrella.", ["a", "an", "the", "no article"], 1],
  ["We ___ dinner when he arrived.", ["have", "had", "were having", "has"], 2],
  ["The comparative of 'good' is ___.", ["gooder", "best", "better", "more good"], 2],
  ["He said that he ___ tired.", ["is", "was", "are", "be"], 1],
  ["Please listen ___ me.", ["at", "on", "to", "for"], 2],
  ["You ___ obey traffic rules.", ["should", "would", "might", "could"], 0]
];

let current = 0;
let answers = [];
let seconds = 1200;
let timerInterval = null;
let score = 0;
let testFinished = false;

function renderQuestion() {
  const q = questions[current];
  $("questionNumber").textContent = current + 1;
  $("questionText").textContent = q[0];
  $("testMarks").textContent = score;
  $("testProgress").style.width = `${(current / 20) * 100}%`;

  const options = $("answerOptions");
  options.innerHTML = "";

  q[1].forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer-btn";
    button.textContent = option;

    if (answers[current] === index) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      if (testFinished) return;
      answers[current] = index;
      renderQuestion();
    });

    options.appendChild(button);
  });

  $("nextQuestionBtn").textContent =
    current === 19 ? "Finish Test" : "Next Question";
}

function updateTimer() {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  $("timer").textContent =
    `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  if (seconds <= 0) {
    clearInterval(timerInterval);
    finishTest(true);
    return;
  }

  seconds--;
}

function startTest() {
  current = 0;
  answers = [];
  score = 0;
  seconds = 1200;
  testFinished = false;

  showScreen("testScreen");
  renderQuestion();
  updateTimer();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
}

function finishTest(timeExpired = false) {
  if (testFinished) return;
  testFinished = true;
  clearInterval(timerInterval);

  if (timeExpired && answers.filter(a => a !== undefined).length < 20) {
    showScreen("statusScreen");
    $("applicationStatus").textContent =
      "Sorry, your time is over. Please try again after 24 hours.";
    $("statusRetryBtn").hidden = true;
    return;
  }

  score = questions.reduce((total, q, i) =>
    total + (answers[i] === q[2] ? 1 : 0), 0);

  $("finalMarks").textContent = score;
  $("admissionMarks").value = `${score}/20`;
  showScreen("resultScreen");
}

function reviewAnswers() {
  const list = $("reviewList");
  list.innerHTML = "";

  questions.forEach((q, i) => {
    const item = document.createElement("div");
    item.className = "review-item";

    const chosen = answers[i] === undefined
      ? "Not answered"
      : q[1][answers[i]];

    item.textContent =
      `${i + 1}. ${q[0]} Your answer: ${chosen}. Correct answer: ${q[1][q[2]]}.`;

    list.appendChild(item);
  });

  showScreen("reviewScreen");
}

$("startBtn").addEventListener("click", () => {
  showScreen("testIntroScreen");
});

$("beginTestBtn").addEventListener("click", startTest);

$("nextQuestionBtn").addEventListener("click", () => {
  if (answers[current] === undefined) {
    alert("Please select an answer first.");
    return;
  }

  if (current === 19) {
    finishTest(false);
  } else {
    current++;
    renderQuestion();
  }
});

$("reviewBtn").addEventListener("click", reviewAnswers);

$("continueAdmissionBtn").addEventListener("click", () => {
  showScreen("admissionScreen");
});

$("reviewContinueBtn").addEventListener("click", () => {
  showScreen("admissionScreen");
});

$("admissionForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  if (!testFinished || !form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form).entries());
  data.marks = score;
  data.status = "pending";
  data.createdAt = serverTimestamp();

  $("admissionMessage").textContent = "Submitting...";

  try {
    await authReady;
    await addDoc(collection(db, "admissions"), data);

    $("admissionMessage").textContent =
      "Application submitted successfully.";
    $("applicationStatus").textContent =
      "Your application is under admin review.";
    showScreen("statusScreen");
  } catch (error) {
    console.error(error);
    $("admissionMessage").textContent =
      "Submission failed. Please check Firebase setup.";
  }
});

$("helpBtn").addEventListener("click", () => {
  $("helpPanel").hidden = !$("helpPanel").hidden;
});

document.querySelectorAll("[data-back]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.back));
});

// Admin authentication is intentionally not enabled here.
// It requires secure Firebase admin accounts and role permissions.
// Admin login selection
const adminAccounts = {
  vinod: "Vinod@Stars2026",
  rajeshree: "Rajeshree@Stars2026",
  yash: "Yash@Stars2026"
};

const adminLoginBtn = document.getElementById("adminLoginBtn");

if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", () => {
    const name = document.getElementById("adminName")?.value;
    const password = document.getElementById("adminPassword")?.value;

    if (adminAccounts[name] === password) {
      showScreen("adminDashboard");
    } else {
      alert("Invalid Admin Name or Password");
    }
  });
}
