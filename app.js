 
import { auth, db, storage, authReady } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const EMAILJS_SERVICE = "service_24dz3vk";
const EMAILJS_TEMPLATE = "template_OCMWJAV";
const EMAILJS_PUBLIC_KEY = "LXEdN0apVk6TUGlGc";
const ADMIN_EMAIL = "starsacademyamalner@gmail.com";

const ADMINS = {
  vinod: {
    name: "Vinod Patil Sir",
    email: "starsacademyamalner+vinod@gmail.com"
  },
  yash: {
    name: "Yash Gujjar",
    email: "starsacademyamalner+yash@gmail.com"
  },
  rajeshree: {
    name: "Rajeshree Madam",
    email: "starsacademyamalner+rajeshree@gmail.com"
  }
};

const $ = id => document.getElementById(id);
const DAY = 24 * 60 * 60 * 1000;
const TEST_DURATION = 20 * 60 * 1000;

let questions = [];
let answers = {};
let questionIndex = 0;
let deadline = 0;
let timerInterval = null;
let currentApplicationId = null;
let statusUnsubscribe = null;
let settingsUnsubscribe = null;
let currentAdmin = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  $(id)?.classList.add("active");
}

function message(id, text) {
  if ($(id)) $(id).textContent = text;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// ENGLISH GRAMMAR QUESTION BANK
const QUESTION_BANK = [
  {q:"Choose the correct article: He is ___ honest man.",o:["a","an","the","no article"],a:1},
  {q:"She ___ to school every day.",o:["go","goes","going","gone"],a:1},
  {q:"They ___ playing cricket now.",o:["is","am","are","be"],a:2},
  {q:"What is the plural of 'child'?",o:["childs","children","childes","childrens"],a:1},
  {q:"Choose the opposite of 'ancient'.",o:["old","modern","historic","past"],a:1},
  {q:"I have lived here ___ 2020.",o:["for","since","from","by"],a:1},
  {q:"He is taller ___ his brother.",o:["then","from","than","to"],a:2},
  {q:"Choose the correct spelling.",o:["Beautifull","Beutiful","Beautiful","Beautifal"],a:2},
  {q:"The past tense of 'write' is ___.",o:["writed","written","wrote","writing"],a:2},
  {q:"Identify the noun: The girl sings sweetly.",o:["the","girl","sings","sweetly"],a:1},
  {q:"Choose the correct pronoun: Riya and ___ are friends.",o:["me","I","my","mine"],a:1},
  {q:"He did not ___ the answer.",o:["knows","knew","know","known"],a:2},
  {q:"Choose the synonym of 'happy'.",o:["sad","angry","joyful","weak"],a:2},
  {q:"The sun ___ in the east.",o:["rise","rises","rising","rose"],a:1},
  {q:"Identify the adjective: It is a beautiful flower.",o:["it","is","beautiful","flower"],a:2},
  {q:"We ___ finished our homework.",o:["has","have","having","had been"],a:1},
  {q:"Choose the correct preposition: The book is ___ the table.",o:["in","on","at","by"],a:1},
  {q:"What is the opposite of 'brave'?",o:["strong","cowardly","bold","kind"],a:1},
  {q:"She can ___ English well.",o:["speaks","speaking","speak","spoke"],a:2},
  {q:"Identify the verb: Birds fly in the sky.",o:["birds","fly","the","sky"],a:1},
  {q:"Choose the correct question tag: You are ready, ___?",o:["are you","aren't you","isn't it","don't you"],a:1},
  {q:"The comparative form of 'good' is ___.",o:["gooder","best","better","more good"],a:2},
  {q:"I ___ a movie yesterday.",o:["watch","watched","watching","watches"],a:1},
  {q:"Choose the correct conjunction: Work hard ___ you will succeed.",o:["but","or","and","because"],a:2},
  {q:"Identify the adverb: He runs quickly.",o:["he","runs","quickly","none"],a:2},
  {q:"The feminine of 'king' is ___.",o:["queen","princess","lady","mother"],a:0},
  {q:"Choose the correct form: If I ___ rich, I would help everyone.",o:["am","was","were","be"],a:2},
  {q:"The passive voice of 'She writes a letter' is ___.",o:["A letter wrote her","A letter is written by her","A letter was written","She is written"],a:1},
  {q:"Choose the correct modal: You ___ obey traffic rules.",o:["must","might","would","could"],a:0},
  {q:"What is the plural of 'mouse'?",o:["mouses","mouse","mice","mices"],a:2},
  {q:"Choose the correct spelling.",o:["Necessary","Neccessary","Necesary","Necessery"],a:0},
  {q:"He is good ___ mathematics.",o:["in","on","at","for"],a:2},
  {q:"Identify the conjunction: I stayed home because it rained.",o:["stayed","home","because","rained"],a:2},
  {q:"Choose the correct tense: She ___ dinner before I arrived.",o:["cooks","has cooked","had cooked","cooking"],a:2},
  {q:"The opposite of 'victory' is ___.",o:["success","defeat","prize","win"],a:1},
  {q:"Choose the correct article: ___ Ganga is a holy river.",o:["A","An","The","No article"],a:2},
  {q:"Neither Ram nor Shyam ___ present.",o:["are","were","is","have"],a:2},
  {q:"Choose the correct pronoun: This book is ___.",o:["my","mine","me","I"],a:1},
  {q:"The past participle of 'go' is ___.",o:["went","gone","going","goes"],a:1},
  {q:"Choose the correct preposition: She is interested ___ music.",o:["on","at","in","for"],a:2}
];

function createPaper() {
  const pool = [...QUESTION_BANK];
  const paper = [];

  while (paper.length < 20 && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    paper.push(pool.splice(index, 1)[0]);
  }

  return paper.map((item, index) => ({
    ...item,
    id: index + 1
  }));
}

function getLockUntil() {
  return Number(localStorage.getItem("starsRetryUntil") || 0);
}

function startTest() {
  if (getLockUntil() > Date.now()) {
    showScreen("timeoutScreen");
    return;
  }

  questions = createPaper();
  answers = {};
  questionIndex = 0;
  deadline = Date.now() + TEST_DURATION;

  localStorage.setItem("starsTestDeadline", String(deadline));
  localStorage.setItem("starsTestPaper", JSON.stringify(questions));
  localStorage.setItem("starsTestAnswers", "{}");

  showScreen("testScreen");
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    if ($("timer")) {
      $("timer").textContent =
        `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }

    if (remaining <= 0) {
      expireTest();
    }
  }, 250);
}

function renderQuestion() {
  const item = questions[questionIndex];
  if (!item) return;

  $("questionCounter").textContent = `Question ${questionIndex + 1} of 20`;
  $("answeredCounter").textContent = `Answered: ${Object.keys(answers).length}/20`;
  $("questionText").textContent = item.q;
  $("progressBar").style.width = `${(Object.keys(answers).length / 20) * 100}%`;

  $("optionsContainer").innerHTML = "";

  item.o.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;

    if (answers[item.id] === index) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      answers[item.id] = index;
      localStorage.setItem("starsTestAnswers", JSON.stringify(answers));
      renderQuestion();
    });

    $("optionsContainer").appendChild(button);
  });

  $("previousQuestionButton").disabled = questionIndex === 0;
  $("nextQuestionButton").textContent =
    questionIndex === 19 ? "SUBMIT TEST" : "NEXT";
}

function expireTest() {
  clearInterval(timerInterval);
  localStorage.setItem("starsRetryUntil", String(Date.now() + DAY));
  localStorage.removeItem("starsTestDeadline");
  showScreen("timeoutScreen");
}

function calculateMarks() {
  return questions.reduce((total, item) => {
    return total + (answers[item.id] === item.a ? 1 : 0);
  }, 0);
}

function finishTest() {
  if (Date.now() >= deadline) {
    expireTest();
    return;
  }

  if (Object.keys(answers).length !== 20) {
    alert("Please answer all 20 questions before submitting.");
    return;
  }

  clearInterval(timerInterval);

  const marks = calculateMarks();
  localStorage.setItem("starsTestMarks", String(marks));

  $("resultMarks").textContent = `${marks} / 20`;
  $("resultMessage").textContent = "Your test has been completed successfully.";

  showScreen("resultScreen");
}

function showReview() {
  $("reviewContainer").innerHTML = questions.map(item => {
    const selected = answers[item.id];
    const isCorrect = selected === item.a;

    return `
      <div class="review-item">
        <p><strong>Q${item.id}. ${escapeHTML(item.q)}</strong></p>
        <p>Your answer: ${selected === undefined ? "Not answered" : escapeHTML(item.o[selected])}</p>
        <p>Correct answer: <span class="correct-text">${escapeHTML(item.o[item.a])}</span></p>
        <p class="${isCorrect ? "correct-text" : "wrong-text"}">
          ${isCorrect ? "Correct" : "Wrong"}
        </p>
      </div>
    `;
  }).join("");

  showScreen("reviewScreen");
}

async function submitAdmission(event) {
  event.preventDefault();

  const button = $("submitAdmissionButton");
  button.disabled = true;
  message("admissionMessage", "Submitting your application...");

  try {
    await authReady;

    const marks = Number(localStorage.getItem("starsTestMarks"));
    const paper = questions;
    const reviewAnswers = answers;

    const application = {
      studentName: $("studentName").value.trim(),
      address: $("studentAddress").value.trim(),
      studentClass: $("studentClass").value,
      medium: "Semi-English",
      fatherName: $("fatherName").value.trim(),
      fatherPhone: $("fatherPhone").value.trim(),
      studentPhone: $("studentPhone").value.trim(),
      marks,
      totalMarks: 20,
      questions: paper,
      answers: reviewAnswers,
      status: "pending",
      createdAt: serverTimestamp(),
      submittedAt: Date.now(),
      reviewDeadline: Date.now() + DAY
    };

    const result = await addDoc(collection(db, "applications"), application);
    currentApplicationId = result.id;

    localStorage.setItem("starsApplicationId", result.id);

    showScreen("statusScreen");
    message("applicationStatusText", "Application submitted successfully. Waiting for admin review.");
    renderStudentResources(window.__academySettings || {});
    watchApplication(result.id);

    // Email is a secondary notification; do not delay the student confirmation.
    import("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm")
      .then(emailModule => emailModule.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: ADMIN_EMAIL,
        student_name: application.studentName,
        father_name: application.fatherName,
        student_class: application.studentClass,
        marks: `${marks}/20`,
        application_id: result.id,
        message: `New STARS ACADEMY application from ${application.studentName}. Marks: ${marks}/20. Please open the Admin Panel to review the complete test paper.`
      }, EMAILJS_PUBLIC_KEY))
      .catch(emailError => console.error("Email notification failed:", emailError));

  } catch (error) {
    console.error(error);
    message("admissionMessage", `Submission failed: ${error.message}`);
    button.disabled = false;
  }
}

function watchApplication(id) {
  if (statusUnsubscribe) statusUnsubscribe();

  statusUnsubscribe = onSnapshot(doc(db, "applications", id), snapshot => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    if (data.status === "approved") {
      showScreen("approvedScreen");
      const schedule = data.visitDate && data.visitFrom && data.visitTo
        ? `Visit date: ${data.visitDate} | Time: ${data.visitFrom} to ${data.visitTo}`
        : "Your academy visit date and time will be shared by the admin.";
      message("visitSchedule", schedule);
      return;
    }

    if (data.status === "rejected" || Date.now() >= data.reviewDeadline) {
      showScreen("rejectedScreen");
      const retryAt = Number(data.retryAvailableAt || (data.reviewedAt?.toMillis?.() || data.submittedAt || Date.now()) + DAY);
      const remaining = Math.max(0, retryAt - Date.now());
      $("retryButton").disabled = remaining > 0;
      message("retryCountdown", remaining > 0
        ? "You can try again after the 24-hour waiting period."
        : "You can now try again with a fresh paper.");
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000);
        message("retryCountdown", `Please wait about ${Math.floor(mins / 60)}h ${mins % 60}m before retrying.`);
      }
    } else {
      showScreen("statusScreen");
      message("applicationStatusText", "Waiting for admin review.");
    }
  }, error => {
    console.error("Application status error:", error);
  });
}

// ADMIN LOGIN
$("welcomeLogoButton").addEventListener("click", () => {
  showScreen("adminLoginScreen");
});

$("startButton").addEventListener("click", startTest);

$("adminLoginButton").addEventListener("click", async () => {
  const selected = $("adminSelect").value;
  const password = $("adminPassword").value;

  if (!selected || !password) {
    message("adminLoginMessage", "Select your admin and enter password.");
    return;
  }

  const admin = ADMINS[selected];

  try {
    await authReady;
    const credential = await signInWithEmailAndPassword(
      auth,
      admin.email,
      password
    );

    currentAdmin = admin;

    if (credential.user.email !== admin.email) {
      await signOut(auth);
      throw new Error("Admin account mismatch.");
    }

    $("loggedInAdmin").textContent = `Logged in as ${admin.name}`;
    $("adminPassword").value = "";
    showScreen("adminDashboard");
    await loadApplications();

  } catch (error) {
    console.error(error);
    message("adminLoginMessage", "Login failed. Check the selected admin and password.");
  }
});

$("adminLogoutButton").addEventListener("click", async () => {
  await signOut(auth);
  currentAdmin = null;
  showScreen("welcomeScreen");
});

$("previousQuestionButton").addEventListener("click", () => {
  if (questionIndex > 0) {
    questionIndex--;
    renderQuestion();
  }
});

$("nextQuestionButton").addEventListener("click", () => {
  if (questionIndex < 19) {
    questionIndex++;
    renderQuestion();
  } else {
    finishTest();
  }
});

$("resultNextButton").addEventListener("click", showReview);

$("reviewNextButton").addEventListener("click", () => {
  $("testMarks").value = `${localStorage.getItem("starsTestMarks")} / 20`;
  showScreen("admissionScreen");
});

$("admissionForm").addEventListener("submit", submitAdmission);

$("retryButton").addEventListener("click", () => {
  if (getLockUntil() > Date.now()) return;
  localStorage.removeItem("starsApplicationId");
  localStorage.removeItem("starsTestMarks");
  startTest();
});

// ADMIN APPLICATIONS
async function loadApplications() {
  const list = $("applicationsList");
  list.innerHTML = "<p>Loading applications...</p>";

  try {
    const snapshot = await getDocs(collection(db, "applications"));

    if (snapshot.empty) {
      list.innerHTML = "<p>No applications received yet.</p>";
      return;
    }

    list.innerHTML = "";

    snapshot.forEach(applicationDoc => {
      const data = applicationDoc.data();
      const card = document.createElement("div");
      card.className = "application-card";

      card.innerHTML = `
        <p><strong>${escapeHTML(data.studentName)}</strong></p>
        <p>Class: ${escapeHTML(data.studentClass)}</p>
        <p>Marks: ${escapeHTML(data.marks)}/20</p>
        <p>Status: ${escapeHTML(data.status)}</p>
        <button class="secondary-button view-application" data-id="${applicationDoc.id}">VIEW PAPER</button>
      `;

      list.appendChild(card);
    });

    list.querySelectorAll(".view-application").forEach(button => {
      button.addEventListener("click", () => viewApplication(button.dataset.id));
    });

  } catch (error) {
    console.error(error);
    list.innerHTML = `<p>Could not load applications: ${escapeHTML(error.message)}</p>`;
  }
}

async function viewApplication(id) {
  const snapshot = await getDoc(doc(db, "applications", id));

  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const details = $("applicationDetails");

  const paperHTML = (data.questions || []).map(item => {
    const selected = data.answers?.[item.id];
    const correct = selected === item.a;

    return `
      <div class="review-item">
        <p><strong>Q${item.id}. ${escapeHTML(item.q)}</strong></p>
        <p>Selected: ${selected === undefined ? "Not answered" : escapeHTML(item.o[selected])}</p>
        <p>Correct: ${escapeHTML(item.o[item.a])}</p>
        <p class="${correct ? "correct-text" : "wrong-text"}">${correct ? "Correct" : "Wrong"}</p>
      </div>
    `;
  }).join("");

  details.innerHTML = `
    <h3>Student Details</h3>
    <p>Name: ${escapeHTML(data.studentName)}</p>
    <p>Address: ${escapeHTML(data.address)}</p>
    <p>Class: ${escapeHTML(data.studentClass)}</p>
    <p>Father: ${escapeHTML(data.fatherName)}</p>
    <p>Father Mobile: ${escapeHTML(data.fatherPhone)}</p>
    <p>Student Mobile: ${escapeHTML(data.studentPhone)}</p>
    <h3>Marks: ${escapeHTML(data.marks)}/20</h3>
    <h3>Complete Test Paper</h3>
    ${paperHTML}
    <h3>Visit Schedule (Admin Only)</h3>
    <label for="visitDateInput">Visit Date</label>
    <input id="visitDateInput" type="date">
    <label for="visitFromInput">From Time</label>
    <input id="visitFromInput" type="time">
    <label for="visitToInput">To Time</label>
    <input id="visitToInput" type="time">
    <button class="secondary-button" id="saveVisitScheduleButton">SAVE VISIT SCHEDULE</button>
    <p id="visitScheduleMessage" class="message" role="status"></p>
    <div class="admin-action">
      <button class="primary-button" id="approveApplicationButton">APPROVE</button>
      <button class="secondary-button" id="rejectApplicationButton">REJECT</button>
    </div>
  `;

  $("visitDateInput").value = data.visitDate || "";
  $("visitFromInput").value = data.visitFrom || "";
  $("visitToInput").value = data.visitTo || "";
  $("saveVisitScheduleButton").addEventListener("click", () => saveVisitSchedule(id));
  $("approveApplicationButton").addEventListener("click", () => updateApplicationStatus(id, "approved"));
  $("rejectApplicationButton").addEventListener("click", () => updateApplicationStatus(id, "rejected"));
}

async function saveVisitSchedule(id) {
  const visitDate = $("visitDateInput").value;
  const visitFrom = $("visitFromInput").value;
  const visitTo = $("visitToInput").value;

  if (!visitDate || !visitFrom || !visitTo) {
    message("visitScheduleMessage", "Please enter the date, from time and to time.");
    return;
  }
  if (visitTo <= visitFrom) {
    message("visitScheduleMessage", "To time must be later than from time.");
    return;
  }

  try {
    await updateDoc(doc(db, "applications", id), {
      visitDate, visitFrom, visitTo,
      scheduleUpdatedBy: currentAdmin?.name || "Admin",
      scheduleUpdatedAt: serverTimestamp()
    });
    message("visitScheduleMessage", "Visit schedule saved.");
  } catch (error) {
    console.error(error);
    message("visitScheduleMessage", `Could not save schedule: ${error.message}`);
  }
}

async function updateApplicationStatus(id, status) {
  try {
    await updateDoc(doc(db, "applications", id), {
      status,
      reviewedBy: currentAdmin?.name || "Admin",
      reviewedAt: serverTimestamp(),
      ...(status === "rejected" ? { retryAvailableAt: Date.now() + DAY } : {})
    });

    message("adminSettingsMessage", `Application ${status}.`);
    await loadApplications();

  } catch (error) {
    console.error(error);
    message("adminSettingsMessage", `Update failed: ${error.message}`);
  }
}

// ADMIN SETTINGS
$("uploadLogoButton").addEventListener("click", async () => {
  await uploadAcademyImage("newLogoFile", "academy/logo.png", "academyLogo");
});

$("uploadPhotoButton").addEventListener("click", async () => {
  await uploadAcademyImage("classroomPhotoFile", "academy/classroom.jpg", null);
});

async function uploadAcademyImage(inputId, path, imageId) {
  const file = $(inputId).files[0];

  if (!file) {
    message("adminSettingsMessage", "Please select an image first.");
    return;
  }

  try {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    const freshUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    if (imageId && $(imageId)) $(imageId).src = freshUrl;

    await setDoc(doc(db, "settings", "academy"), {
      ...(imageId ? { logoUrl: freshUrl } : { classroomPhotoUrl: freshUrl })
    }, { merge: true });

    message("adminSettingsMessage", "Image updated successfully.");

  } catch (error) {
    console.error(error);
    message("adminSettingsMessage", `Upload failed: ${error.message}`);
  }
}

$("saveDemoButton").addEventListener("click", async () => {
  const url = $("demoLectureUrl").value.trim();

  if (!url.startsWith("https://")) {
    message("adminSettingsMessage", "Enter a valid HTTPS demo lecture link.");
    return;
  }

  try {
    await setDoc(doc(db, "settings", "academy"), {
      demoLectureUrl: url
    }, { merge: true });

    message("adminSettingsMessage", "Demo lecture link saved.");

  } catch (error) {
    message("adminSettingsMessage", `Save failed: ${error.message}`);
  }
});

// LIVE ACADEMY SETTINGS: changes from Admin Panel reach student screens automatically.
function renderStudentResources(settings) {
  const area = $("studentAcademyResources");
  if (!area) return;
  const demo = typeof settings.demoLectureUrl === "string" && settings.demoLectureUrl.startsWith("https://") ? settings.demoLectureUrl : "";
  const photo = typeof settings.classroomPhotoUrl === "string" && settings.classroomPhotoUrl.startsWith("https://") ? settings.classroomPhotoUrl : "";
  area.replaceChildren();
  if (!demo && !photo) { area.hidden = true; return; }
  area.hidden = false;
  const heading = document.createElement("h3"); heading.textContent = "STARS ACADEMY"; area.appendChild(heading);
  if (demo) { const link = document.createElement("a"); link.href = demo; link.target = "_blank"; link.rel = "noopener"; link.className = "secondary-button"; link.textContent = "WATCH DEMO LECTURE"; area.appendChild(link); }
  if (photo) { const image = document.createElement("img"); image.src = photo; image.alt = "STARS ACADEMY classroom"; image.loading = "lazy"; image.className = "classroom-photo"; area.appendChild(image); }
}

function applyAcademySettings(settings = {}) {
  window.__academySettings = settings;
  if (settings.logoUrl) $("academyLogo").src = settings.logoUrl;
  if ($("demoLectureUrl") && settings.demoLectureUrl) $("demoLectureUrl").value = settings.demoLectureUrl;
  renderStudentResources(settings);
}

function loadAcademySettings() {
  if (settingsUnsubscribe) settingsUnsubscribe();
  settingsUnsubscribe = onSnapshot(doc(db, "settings", "academy"), snapshot => {
    applyAcademySettings(snapshot.exists() ? snapshot.data() : {});
  }, error => console.error("Live academy settings failed:", error));
}

// RESUME PENDING APPLICATION STATUS AFTER REFRESH
async function resumeApplication() {
  const id = localStorage.getItem("starsApplicationId");

  if (id) {
    currentApplicationId = id;
    watchApplication(id);
    return;
  }

  const savedDeadline = Number(localStorage.getItem("starsTestDeadline") || 0);

  if (savedDeadline && savedDeadline > Date.now()) {
    try {
      questions = JSON.parse(localStorage.getItem("starsTestPaper") || "[]");
      answers = JSON.parse(localStorage.getItem("starsTestAnswers") || "{}");
      deadline = savedDeadline;

      if (questions.length === 20) {
        showScreen("testScreen");
        renderQuestion();
        startTimer();
      }
    } catch (error) {
      console.error(error);
    }
  } else if (savedDeadline && savedDeadline <= Date.now()) {
    expireTest();
  }
}

await authReady;
await loadAcademySettings();
await resumeApplication();
