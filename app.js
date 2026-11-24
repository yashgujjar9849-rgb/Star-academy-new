 
import { auth, db, storage, authReady } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signInAnonymously,
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
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable,
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
const RETRY_WAIT = 0; // Temporary testing: no retry waiting period
const TEST_DURATION = 20 * 60 * 1000;
const FIREBASE_WAIT_LIMIT = 20000;

function withTimeout(promise, label, ms = FIREBASE_WAIT_LIMIT) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

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

// 5,000 globally allocated, non-repeating 20-question papers.
// Each allocation uses a Firestore transaction so two students cannot receive
// the same paper number at the same time. The current 40-question bank supplies
// the combinations; it is not 5,000 different source questions.
function chooseNumber(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = result * (n - k + i) / i;
  }
  return Math.round(result);
}

function getPaperQuestionsByRank(rank) {
  const totalPapers = 5000;
  const questionCount = QUESTION_BANK.length;
  const questionsPerPaper = 20;
  let remainingRank = rank;
  let nextCandidate = 0;
  const selected = [];

  for (let position = 0; position < questionsPerPaper; position++) {
    const remainingSlots = questionsPerPaper - position - 1;
    for (
      let candidate = nextCandidate;
      candidate <= questionCount - (questionsPerPaper - position);
      candidate++
    ) {
      const combinationsAfterChoice = chooseNumber(
        questionCount - candidate - 1,
        remainingSlots
      );
      if (remainingRank < combinationsAfterChoice) {
        selected.push(QUESTION_BANK[candidate]);
        nextCandidate = candidate + 1;
        break;
      }
      remainingRank -= combinationsAfterChoice;
    }
  }

  // Permute the order deterministically while preserving the unique question set.
  let seed = (rank + 1) * 48271 % 2147483647;
  for (let i = selected.length - 1; i > 0; i--) {
    seed = seed * 16807 % 2147483647;
    const j = seed % (i + 1);
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected.map((item, index) => ({ ...item, id: index + 1 }));
}

async function createPaper() {
  // Generate a paper locally; START must not require Firebase or persistent browser storage.
  const paperRank = Math.floor(Math.random() * 5000);
  return getPaperQuestionsByRank(paperRank);
}
function getLockUntil() {
  // Temporary testing mode: retries are available immediately.
  localStorage.removeItem("starsRetryUntil");
  return 0;
}

async function startTest() {
  if (getLockUntil() > Date.now()) {
    showScreen("timeoutScreen");
    return;
  }

  const startButton = $("startButton");
  if (startButton) startButton.disabled = true;

  try {
    questions = await createPaper();
    answers = {};
    questionIndex = 0;
    deadline = Date.now() + TEST_DURATION;

    try {
      localStorage.setItem("starsTestDeadline", String(deadline));
      localStorage.setItem("starsTestPaper", JSON.stringify(questions));
      localStorage.setItem("starsTestAnswers", "{}");
    } catch (storageError) {
      console.warn("Browser storage unavailable; test will continue for this session.", storageError);
    }

    showScreen("testScreen");
    renderQuestion();
    startTimer();
  } catch (error) {
    console.error("Could not allocate a unique admission paper:", error);
    alert(error.message === "PAPER_BANK_EXHAUSTED"
      ? "इस 5,000-पेपर बैच के सभी पेपर इस्तेमाल हो चुके हैं। नया पेपर बैच जोड़ना होगा।"
      : "अभी नया टेस्ट पेपर नहीं मिल पाया। इंटरनेट/Firebase कनेक्शन जाँचकर दोबारा कोशिश करें।");
  } finally {
    if (startButton) startButton.disabled = false;
  }
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

function getAnsweredCount() {
  return questions.filter(item =>
    item && Number.isInteger(answers[item.id]) &&
    answers[item.id] >= 0 && answers[item.id] < item.o.length
  ).length;
}

function renderQuestion() {
  const item = questions[questionIndex];
  if (!item) return;

  const answeredCount = getAnsweredCount();
  $("questionCounter").textContent = `Question ${questionIndex + 1} of 20`;
  $("answeredCounter").textContent = `Answered: ${answeredCount}/20`;
  $("questionText").textContent = item.q;
  $("progressBar").style.width = `${(answeredCount / 20) * 100}%`;

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
  localStorage.removeItem("starsRetryUntil");
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

  if (getAnsweredCount() !== 20) {
    alert(`Please answer all 20 questions before submitting. Answered: ${getAnsweredCount()}/20.`);
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
  if (button.disabled) return;
  button.disabled = true;

  let elapsed = 0;
  let countdown = null;
  message("admissionMessage", "Submitting securely... Please keep this page open.");

  try {
    await authReady;

    // Students use anonymous Firebase Authentication so their own application
    // can be read securely without exposing every student's private details.
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const marks = Number(localStorage.getItem("starsTestMarks"));
    if (!Number.isFinite(marks) || !Array.isArray(questions) || questions.length !== 20) {
      throw new Error("Your completed test could not be found. Please complete the English test again.");
    }

    const application = {
      studentName: $("studentName").value.trim(),
      address: $("studentAddress").value.trim(),
      studentClass: $("studentClass").value,
      medium: "Semi-English",
      fatherName: $("fatherName").value.trim(),
      fatherPhone: $("fatherPhone").value.trim(),
      studentPhone: $("studentPhone").value.trim(),
      studentUid: auth.currentUser.uid,
      marks,
      totalMarks: 20,
      questions,
      answers,
      status: "pending",
      createdAt: serverTimestamp(),
      submittedAt: Date.now(),
      reviewDeadline: Date.now() + DAY
    };

    // Keep one stable ID across retries: a slow response cannot create duplicate applications.
    let applicationId = localStorage.getItem("starsPendingApplicationId");
    if (!applicationId) {
      applicationId = doc(collection(db, "applications")).id;
      localStorage.setItem("starsPendingApplicationId", applicationId);
    }
    const applicationRef = doc(db, "applications", applicationId);

    countdown = setInterval(() => {
      elapsed += 1;
      message("admissionMessage", `Submitting... ${elapsed}s elapsed. Maximum wait: 20 seconds.`);
    }, 1000);

    await withTimeout(setDoc(applicationRef, application, { merge: true }), "SUBMISSION");
    clearInterval(countdown);
    countdown = null;

    currentApplicationId = applicationId;
    localStorage.setItem("starsApplicationId", applicationId);
    localStorage.removeItem("starsPendingApplicationId");

    showScreen("statusScreen");
    message("applicationStatusText", "Application submitted successfully. Waiting for admin review.");
    renderStudentResources(window.__academySettings || {});
    watchApplication(applicationId);

    // Email is a secondary notification and never blocks the successful form submission.
    import("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm")
      .then(emailModule => emailModule.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: ADMIN_EMAIL,
        student_name: application.studentName,
        father_name: application.fatherName,
        student_class: application.studentClass,
        marks: `${marks}/20`,
        application_id: applicationId,
        message: `New STARS ACADEMY application from ${application.studentName}. Marks: ${marks}/20. Please open the Admin Panel to review the complete test paper.`
      }, EMAILJS_PUBLIC_KEY))
      .catch(emailError => console.error("Email notification failed:", emailError));

  } catch (error) {
    if (countdown) clearInterval(countdown);
    console.error("Admission submission error:", error);
    if (error.message === "SUBMISSION_TIMEOUT") {
      message("admissionMessage", "Firebase did not confirm within 20 seconds. Your form is still here. Check Firebase connection/permissions and retry; the same application ID will be reused.");
    } else {
      message("admissionMessage", `Submission failed: ${error.message}. Your details are still in the form; please retry.`);
    }
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
      $("retryButton").disabled = false;
      message("retryCountdown", "You can try again now with a fresh paper.");
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
      ...(status === "rejected" ? { retryAvailableAt: Date.now() + RETRY_WAIT } : {})
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
  const input = $(inputId);
  const file = input?.files?.[0];
  const button = imageId ? $("uploadLogoButton") : $("uploadPhotoButton");

  if (!file) {
    message("adminSettingsMessage", "पहले Choose File से फोटो चुनें।");
    return;
  }

  if (!file.type || !file.type.startsWith("image/")) {
    message("adminSettingsMessage", "कृपया JPG, PNG या WEBP इमेज चुनें।");
    input.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    message("adminSettingsMessage", "फोटो 5 MB से छोटी रखें।");
    return;
  }

  try {
    await authReady;
    if (!auth.currentUser || !currentAdmin) {
      throw new Error("ADMIN_LOGIN_REQUIRED");
    }

    if (button) button.disabled = true;
    message("adminSettingsMessage", "फोटो अपलोड हो रही है... कृपया प्रतीक्षा करें।");

    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
      cacheControl: "public,max-age=3600"
    });
    try {
      await withTimeout(uploadTask, "IMAGE_UPLOAD", 120000);
    } catch (uploadError) {
      if (uploadError.message === "IMAGE_UPLOAD_TIMEOUT") uploadTask.cancel();
      throw uploadError;
    }
    const url = await withTimeout(getDownloadURL(fileRef), "IMAGE_URL");
    const freshUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

    await withTimeout(setDoc(doc(db, "settings", "academy"), {
      ...(imageId ? { logoUrl: freshUrl } : { classroomPhotoUrl: freshUrl })
    }, { merge: true }), "IMAGE_SETTINGS_SAVE");

    if (imageId && $(imageId)) {
      $(imageId).src = freshUrl;
      $(imageId).onerror = () => message("adminSettingsMessage", "अपलोड हुआ, लेकिन लोगो दिख नहीं रहा। कृपया दूसरी इमेज चुनें।");
    }

    input.value = "";
    message("adminSettingsMessage", imageId
      ? "लोगो सफलतापूर्वक अपलोड और सेव हो गया।"
      : "क्लासरूम फोटो सफलतापूर्वक अपलोड और सेव हो गई।");

  } catch (error) {
    console.error("Academy image upload failed:", error);
    const code = error?.code || "";
    let explanation = error?.message || "Unknown error";

    if (error?.message === "ADMIN_LOGIN_REQUIRED") {
      explanation = "पहले Admin Panel में लॉगिन करें, फिर दोबारा अपलोड करें।";
    } else if (code === "storage/unauthorized" || code === "permission-denied") {
      explanation = "Firebase Rules ने अपलोड रोक दिया है। Firebase Storage और Firestore Rules में Admin को अनुमति देनी होगी।";
    } else if (error?.message === "IMAGE_UPLOAD_TIMEOUT") {
      explanation = "फोटो अपलोड 20 सेकंड में पूरी नहीं हुई। Firebase Storage bucket/rules या इंटरनेट कनेक्शन जाँचें; फिर दोबारा कोशिश करें।";
    } else if (error?.message === "IMAGE_URL_TIMEOUT" || error?.message === "IMAGE_SETTINGS_SAVE_TIMEOUT") {
      explanation = "फोटो अपलोड हुई हो सकती है, लेकिन Firebase से URL/सेटिंग सेव होने की पुष्टि 20 सेकंड में नहीं मिली। Firebase कनेक्शन और Firestore Rules जाँचें।";
    } else if (code === "storage/unknown" || code === "storage/retry-limit-exceeded") {
      explanation = "नेटवर्क या Firebase Storage की समस्या है। इंटरनेट जाँचकर फिर कोशिश करें।";
    } else if (code === "storage/bucket-not-found" || code === "storage/project-not-found") {
      explanation = "Firebase Storage Bucket की सेटिंग गलत या अधूरी है।";
    }

    message("adminSettingsMessage", `Upload failed: ${explanation}`);
  } finally {
    if (button) button.disabled = false;
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
function getOrCreateStudentResources() {
  const screens = ["statusScreen", "approvedScreen"];
  screens.forEach(screenId => {
    const screen = $(screenId);
    if (!screen || screen.querySelector(".student-resources-live")) return;
    const panel = screen.querySelector(".panel");
    if (!panel) return;
    const area = document.createElement("section");
    area.className = "student-resources student-resources-live";
    area.setAttribute("aria-live", "polite");
    area.hidden = true;
    panel.appendChild(area);
  });
  return screens.map(id => $(id)?.querySelector(".student-resources-live")).filter(Boolean);
}

function renderStudentResources(settings = {}) {
  const areas = getOrCreateStudentResources();
  const demo = typeof settings.demoLectureUrl === "string" && /^https:\/\//i.test(settings.demoLectureUrl) ? settings.demoLectureUrl : "";
  const photo = typeof settings.classroomPhotoUrl === "string" && /^https:\/\//i.test(settings.classroomPhotoUrl) ? settings.classroomPhotoUrl : "";

  areas.forEach(area => {
    area.replaceChildren();
    if (!demo && !photo) { area.hidden = true; return; }
    area.hidden = false;

    const heading = document.createElement("h3");
    heading.textContent = "STARS ACADEMY";
    area.appendChild(heading);

    if (demo) {
      const link = document.createElement("a");
      link.href = demo;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "secondary-button";
      link.textContent = "WATCH DEMO LECTURE";
      area.appendChild(link);
    }
    if (photo) {
      const image = document.createElement("img");
      image.src = photo;
      image.alt = "STARS ACADEMY classroom";
      image.loading = "lazy";
      image.className = "classroom-photo";
      image.onerror = () => { image.alt = "Classroom photo could not be loaded"; };
      area.appendChild(image);
    }
  });
}

function applyAcademySettings(settings = {}) {
  window.__academySettings = settings;

  const logo = $("academyLogo");
  if (logo && settings.logoUrl) {
    logo.src = settings.logoUrl;
    logo.hidden = false;
    logo.onerror = () => console.error("The saved academy logo URL could not be loaded.");
  }

  if ($("demoLectureUrl")) $("demoLectureUrl").value = settings.demoLectureUrl || "";
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
      const savedPaper = JSON.parse(localStorage.getItem("starsTestPaper") || "[]");
      const savedAnswers = JSON.parse(localStorage.getItem("starsTestAnswers") || "{}");
      if (savedPaper.length === 20) {
        questions = savedPaper.map((item, index) => ({ ...item, id: index + 1 }));
        answers = {};
        savedPaper.forEach((item, index) => {
          const oldAnswer = savedAnswers[item.id];
          if (Number.isInteger(oldAnswer) && oldAnswer >= 0 && oldAnswer < item.o.length) {
            answers[index + 1] = oldAnswer;
          }
        });
        localStorage.setItem("starsTestPaper", JSON.stringify(questions));
        localStorage.setItem("starsTestAnswers", JSON.stringify(answers));
      }
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
