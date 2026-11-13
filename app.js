/* ==================== PROJECT ASO — CORE ENGINE & STATE ARCHITECTURE ==================== */
(() => {
  "use strict";

  const STORAGE_KEY = "project_aso_master_v2";
  const ACTIVE_EXAM_KEY = "project_aso_active_exam_v2";

  const SYLLABUS_UNITS = [
    { id: 1, title: "Arrival of Gandhi & Early Mass Movements", period: "1915–1927" },
    { id: 2, title: "Civil Disobedience & Constitutional Reforms", period: "1927–1937" },
    { id: 3, title: "World War II, Quit India & Subhas Bose / INA", period: "1938–1945" },
    { id: 4, title: "Freedom, Partition & Post-1947 Consolidation", period: "1945–1950" },
    { id: 5, title: "Odisha in the Freedom Struggle & Merger", period: "1915–1948" }
  ];

  const DEFAULT_ACHIEVEMENTS = [
    { id: "first_step", icon: "🌱", title: "First Step Taken", desc: "Complete your first practice session or mock test.", secretNote: "Starting is half the battle—you're officially in the arena!" },
    { id: "full_warrior", icon: "🛡️", title: "90-Minute Endurance", desc: "Complete a full 100-question OPSC ASO Mock.", secretNote: "100 questions in 90 minutes takes real composure. Proud of your focus!" },
    { id: "cutoff_clear", icon: "🎯", title: "Benchmark Cleared", desc: "Score 35.00 or higher in a Full ASO Mock.", secretNote: "You cleared the qualifying benchmark—now let's push toward top-rank territory!" },
    { id: "high_flyer", icon: "👑", title: "Secretariat Contender", desc: "Score 70.00 or higher in a Full ASO Mock.", secretNote: "70+ with negative marking is serious officer-grade command!" },
    { id: "streak_3", icon: "🔥", title: "3-Day Consistency", desc: "Study for 3 consecutive days.", secretNote: "Three days in a row—habits are quietly turning into results." },
    { id: "odisha_pride", icon: "🏛️", title: "Utkal Historian", desc: "Score 80%+ accuracy in Unit 5 (Odisha Freedom Struggle).", secretNote: "Odisha history is a game-changer in OPSC ASO—and you own it!" }
  ];

  const DEFAULT_STATE = {
    profile: {
      name: "Future ASO",
      targetExam: "OPSC ASO (Secretariat Service)",
      targetScore: 75,
      dailyGoal: 20,
      teaseFreq: "moderate",
      defaultFeedback: "immediate"
    },
    admin: {
      pin: "1947",
      organiserName: "PROJECT ASO Organiser",
      welcomeTitle: "Welcome, Future ASO!",
      welcomeBody: "Every big achievement begins with steady, fearless steps. This space is built exclusively for your OPSC ASO preparation—combining real exam discipline with calm, focused revision.",
      teaseMessages: [
        "The Indian freedom struggle isn't going to revise itself.",
        "1915 to 1947 is only 32 years—surely you can master 100 questions on it!",
        "Remember: skipping a wild guess saves +0.25 marks. Be smart, not reckless!",
        "Gandhi marched 240 miles to Dandi; you just need to finish today's 20 MCQs.",
        "Accuracy beats speed every single time in OPSC ASO."
      ],
      secretLetters: [
        {
          id: "letter_start",
          title: "Before You Begin",
          unlockRule: "Always Unlocked",
          minMocks: 0,
          minScore: 0,
          body: "Preparing for a competitive exam takes quiet courage. Use Full Mocks to build stamina, and use Practice Mode without pressure. One question at a time, you are getting closer."
        },
        {
          id: "letter_first_mock",
          title: "After Your First 100-MCQ Mock",
          unlockRule: "Complete 1 Full Mock",
          minMocks: 1,
          minScore: 0,
          body: "Finishing a full 100-question paper with negative marking is no small feat. Don't worry about the mistakes today—every wrong answer in practice is one mark saved on exam day."
        },
        {
          id: "letter_65_plus",
          title: "When You Cross 65+ Marks",
          unlockRule: "Score 65+ in Full Mock",
          minMocks: 1,
          minScore: 65,
          body: "Look at how far your accuracy has come! Your command over 1915–1947 and Odisha's freedom movement is shining through. Keep this calm momentum going."
        }
      ]
    },
    customQuestions: [],
    deletedQuestionIds: [],
    attempts: [],
    mistakeIds: [],
    masteredMistakeIds: [],
    studyDates: [],
    unlockedAchievements: [],
    lastBackupExport: null
  };

  let state = loadState();
  let activeSession = null;
  let timerInterval = null;
  let selectedConfigMode = null;
  let lastCompletedResult = null;
  let adminUnlocked = false;

  /* -------------------- STORAGE & QUESTION BANK HELPERS -------------------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
        admin: { ...DEFAULT_STATE.admin, ...(parsed.admin || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getQuestionBank() {
    const base = Array.isArray(window.INITIAL_QUESTIONS) ? window.INITIAL_QUESTIONS : [];
    const deletedSet = new Set(state.deletedQuestionIds || []);
    const customMap = new Map((state.customQuestions || []).map(q => [q.id, q]));
    const merged = [];

    base.forEach(q => {
      if (deletedSet.has(q.id)) return;
      merged.push(customMap.has(q.id) ? customMap.get(q.id) : q);
      customMap.delete(q.id);
    });
    customMap.forEach(q => {
      if (!deletedSet.has(q.id)) merged.push(q);
    });
    return merged;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function calculateStreak() {
    const dates = [...new Set(state.studyDates)].sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    const cursor = new Date();
    const today = todayStr();
    if (dates[0] !== today) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterday = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (dates[0] !== yesterday) return 0;
    }
    const set = new Set(dates);
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (set.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  /* -------------------- THEME & NAVIGATION ROUTER -------------------- */
  const SECTION_THEMES = {
    dashboard: "theme-welcome",
    "exam-centre": "theme-practice",
    instructions: "theme-cbt",
    arena: "theme-cbt",
    results: "theme-results",
    learning: "theme-practice",
    progress: "theme-welcome",
    achievements: "theme-achievements",
    motivation: "theme-letters",
    profile: "theme-welcome",
    organiser: "theme-cbt"
  };

  const SECTION_TITLES = {
    dashboard: "01. Home Dashboard",
    "exam-centre": "02. Examination Centre",
    instructions: "Full Mock Instructions",
    arena: "Active Examination Arena",
    results: "Scorecard & Analytics",
    learning: "03. Learning Centre",
    progress: "04. My Progress",
    achievements: "05. Achievement Arena",
    motivation: "06. Motivation Corner",
    profile: "07. Candidate Profile",
    organiser: "08. Organiser Control Panel"
  };

  function setTheme(themeClass) {
    document.body.className = themeClass;
  }

  function navigateTo(sectionId) {
    if (activeSession && sectionId !== "arena") {
      if (!confirm("An examination session is currently active. Leave the arena? (Your progress remains auto-saved.)")) {
        return;
      }
      stopTimer();
    }

    document.querySelectorAll(".view-section").forEach(el => el.classList.add("hidden"));
    const target = document.getElementById(`view-${sectionId}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.nav === sectionId);
    });

    if (sectionId === "arena" && activeSession) {
      setTheme(activeSession.isFullMock ? "theme-cbt" : "theme-practice");
    } else {
      setTheme(SECTION_THEMES[sectionId] || "theme-welcome");
    }

    document.getElementById("topbar-section-label").textContent = SECTION_TITLES[sectionId] || "PROJECT ASO";
    closeMobileNav();

    if (sectionId === "dashboard") renderDashboard();
    if (sectionId === "learning") renderLearningCentre();
    if (sectionId === "progress") renderProgressSection();
    if (sectionId === "achievements") renderAchievementsSection();
    if (sectionId === "motivation") renderMotivationSection();
    if (sectionId === "profile") renderProfileSection();
    if (sectionId === "organiser") renderOrganiserSection();
  }

  function closeMobileNav() {
    document.getElementById("nav-drawer").classList.remove("open");
    document.getElementById("nav-backdrop").classList.add("hidden");
  }

  /* -------------------- SCREEN 01: ENVELOPE WELCOME -------------------- */
  function initWelcomeScreen() {
    document.getElementById("welcome-greeting").textContent = state.admin.welcomeTitle.replace("Future ASO", state.profile.name || "Future ASO");
    document.getElementById("welcome-body").textContent = state.admin.welcomeBody;
    document.getElementById("welcome-signoff").textContent = `— ${state.admin.organiserName}`;

    const envelopeWrapper = document.getElementById("envelope-wrapper");
    const envelopeBox = document.getElementById("envelope-box");
    const letterCard = document.getElementById("welcome-letter-card");

    const openEnvelope = () => {
      envelopeBox.classList.add("opened");
      setTimeout(() => {
        envelopeWrapper.classList.add("hidden");
        letterCard.classList.remove("hidden");
      }, 420);
    };

    envelopeWrapper.addEventListener("click", openEnvelope);
    envelopeWrapper.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") openEnvelope();
    });

    const enterStudyWorld = () => {
      document.getElementById("screen-welcome").classList.add("hidden");
      document.getElementById("app-shell").classList.remove("hidden");
      checkResumeSavedExam();
      navigateTo("dashboard");
    };

    document.getElementById("btn-enter-world").addEventListener("click", enterStudyWorld);
    document.getElementById("btn-skip-intro").addEventListener("click", enterStudyWorld);
  }

  /* -------------------- 01. HOME DASHBOARD -------------------- */
  function renderDashboard() {
    const bank = getQuestionBank();
    document.getElementById("nav-bank-count").textContent = `${bank.length} MCQs Loaded`;
    document.getElementById("dash-target-badge").textContent = `Target: ${state.profile.targetExam}`;
    document.getElementById("dash-greeting").textContent = `Welcome back, ${state.profile.name}!`;

    const teaseEl = document.getElementById("dash-tease");
    if (state.profile.teaseFreq === "off") {
      teaseEl.classList.add("hidden");
    } else {
      teaseEl.classList.remove("hidden");
      const list = state.admin.teaseMessages;
      teaseEl.textContent = list[Math.floor(Math.random() * list.length)] || "";
    }

    const fullMocks = state.attempts.filter(a => a.isFullMock);
    const lastAttempt = state.attempts[0];
    document.getElementById("dash-last-score").textContent = lastAttempt ? `${lastAttempt.netScore.toFixed(2)}` : "—";
    document.getElementById("dash-last-meta").textContent = lastAttempt ? `${lastAttempt.modeLabel} (${lastAttempt.accuracy}%)` : "No attempts yet";

    const bestMock = fullMocks.length ? Math.max(...fullMocks.map(a => a.netScore)) : (state.attempts.length ? Math.max(...state.attempts.map(a => a.netScore)) : null);
    document.getElementById("dash-best-score").textContent = bestMock !== null ? bestMock.toFixed(2) : "—";

    const streak = calculateStreak();
    document.getElementById("dash-streak").textContent = `${streak} Day${streak === 1 ? "" : "s"}`;
    document.getElementById("topbar-streak-pill").textContent = `🔥 ${streak}d`;

    // Today's questions
    const today = todayStr();
    const todayQuestions = state.attempts
      .filter(a => a.date === today)
      .reduce((sum, a) => sum + a.totalQuestions, 0);
    const goal = state.profile.dailyGoal || 20;
    const pct = Math.min(100, Math.round((todayQuestions / goal) * 100));
    document.getElementById("daily-challenge-desc").textContent = `Complete at least ${goal} practice MCQs or 1 mock test today.`;
    document.getElementById("daily-challenge-bar").style.width = `${pct}%`;
    document.getElementById("daily-challenge-count").textContent = `${todayQuestions} / ${goal} Questions today`;
    document.getElementById("daily-challenge-status").textContent = pct >= 100 ? "Completed ✓" : "In Progress";
    document.getElementById("dash-today-status").textContent = pct >= 100 ? "Daily target met!" : `${Math.max(0, goal - todayQuestions)} Qs left today`;

    // Units completed
    const practisedUnits = new Set();
    state.attempts.forEach(a => (a.unitsCovered || []).forEach(u => practisedUnits.add(u)));
    document.getElementById("dash-units-done").textContent = `${practisedUnits.size} / 5`;

    // Weakest unit recommendation
    const weakness = computeWeaknessAnalysis();
    document.getElementById("dash-revision-target").textContent = weakness.summaryText;

    // Unit mini cards
    const unitGrid = document.getElementById("dash-units-list");
    unitGrid.innerHTML = SYLLABUS_UNITS.map(u => {
      const count = bank.filter(q => q.unit === u.id).length;
      return `
        <div class="unit-mini-card">
          <span class="badge">Unit ${u.id} • ${u.period}</span>
          <h4>${u.title}</h4>
          <small>${count} Verified MCQs</small>
        </div>
      `;
    }).join("");

    // Backup reminder check (if >5 attempts and no recent export)
    if (state.attempts.length >= 3 && !state.lastBackupExport) {
      document.getElementById("backup-reminder-bar").classList.remove("hidden");
    }
  }

  /* -------------------- 02. EXAMINATION CENTRE & CONFIG -------------------- */
  function initExamCentre() {
    document.querySelectorAll(".mode-card").forEach(card => {
      card.addEventListener("click", () => {
        openModeConfig(card.dataset.mode);
      });
    });

    document.getElementById("btn-close-config").addEventListener("click", () => {
      document.getElementById("mode-config-panel").classList.add("hidden");
    });

    document.getElementById("btn-proceed-mode").addEventListener("click", launchConfiguredMode);

    document.getElementById("chk-confirm-instructions").addEventListener("change", e => {
      document.getElementById("btn-begin-full-mock").disabled = !e.target.checked;
    });

    document.getElementById("btn-back-from-instructions").addEventListener("click", () => navigateTo("exam-centre"));
    document.getElementById("btn-begin-full-mock").addEventListener("click", () => {
      startSession({
        mode: "full_mock",
        modeLabel: "Full ASO Mock (100 Qs)",
        isFullMock: true,
        durationSeconds: 90 * 60,
        feedbackTiming: "end",
        shuffle: false
      });
    });
  }

  function openModeConfig(mode) {
    selectedConfigMode = mode;
    const panel = document.getElementById("mode-config-panel");
    const title = document.getElementById("config-panel-title");
    const body = document.getElementById("config-panel-body");
    panel.classList.remove("hidden");

    const feedbackSelector = `
      <div class="form-group">
        <label>Feedback Timing</label>
        <select id="cfg-feedback" class="input">
          <option value="immediate" ${state.profile.defaultFeedback === "immediate" ? "selected" : ""}>Immediate Feedback (After each answer)</option>
          <option value="every5" ${state.profile.defaultFeedback === "every5" ? "selected" : ""}>Checkpoint After Every 5 Questions</option>
          <option value="end" ${state.profile.defaultFeedback === "end" ? "selected" : ""}>After Completing the Test</option>
        </select>
      </div>
    `;

    if (mode === "full_mock") {
      title.textContent = "1. Full OPSC ASO Mock Configuration";
      body.innerHTML = `
        <p><strong>100 Questions • 90 Minutes • +1.00 / -0.25 Marking • End-of-Exam Evaluation.</strong></p>
        <p>Proceeding opens the mandatory OPSC ASO CBT General Instructions page.</p>
      `;
    } else if (mode === "unit_practice") {
      title.textContent = "2. Unit-wise Practice (20 Questions)";
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group">
            <label>Select Syllabus Unit</label>
            <select id="cfg-unit" class="input">
              ${SYLLABUS_UNITS.map(u => `<option value="${u.id}">Unit ${u.id}: ${u.title} (${u.period})</option>`).join("")}
            </select>
          </div>
          ${feedbackSelector}
        </div>
      `;
    } else if (mode === "difficulty") {
      title.textContent = "3. Difficulty Challenge";
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group">
            <label>Difficulty Tier</label>
            <select id="cfg-diff" class="input">
              <option value="Easy">Easy Tier (Foundational Facts & Dates)</option>
              <option value="Medium">Medium Tier (Application & Chronology)</option>
              <option value="Hard">Hard Tier (Multi-Statement & Deep Analysis)</option>
            </select>
          </div>
          ${feedbackSelector}
        </div>
      `;
    } else if (mode === "rapid_fire") {
      title.textContent = "4. Rapid Fire Speed Drill";
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group">
            <label>Number of Questions</label>
            <select id="cfg-count" class="input">
              <option value="10">10 Questions (7.5 Minutes)</option>
              <option value="15">15 Questions (11 Minutes)</option>
            </select>
          </div>
          ${feedbackSelector}
        </div>
      `;
    } else if (mode === "mistake_revision") {
      title.textContent = "5. Mistake Revision Drill";
      const activeMistakes = state.mistakeIds.filter(id => !state.masteredMistakeIds.includes(id));
      body.innerHTML = `
        <p>Saved unmastered mistakes & skipped questions available: <strong>${activeMistakes.length}</strong>.</p>
        ${feedbackSelector}
      `;
    } else if (mode === "surprise") {
      title.textContent = "6. Surprise Mixed Test";
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group">
            <label>Question Count</label>
            <select id="cfg-count" class="input">
              <option value="20">20 Random Questions (18 Mins)</option>
              <option value="30">30 Random Questions (27 Mins)</option>
            </select>
          </div>
          ${feedbackSelector}
        </div>
      `;
    }
    panel.scrollIntoView({ behavior: "smooth" });
  }

  function launchConfiguredMode() {
    const bank = getQuestionBank();
    if (!bank.length) {
      alert("Question bank is empty! Please load questions.js in your folder.");
      return;
    }

    if (selectedConfigMode === "full_mock") {
      document.getElementById("chk-confirm-instructions").checked = false;
      document.getElementById("btn-begin-full-mock").disabled = true;
      navigateTo("instructions");
      return;
    }

    const feedbackTiming = document.getElementById("cfg-feedback")?.value || "immediate";

    if (selectedConfigMode === "unit_practice") {
      const unitId = Number(document.getElementById("cfg-unit").value);
      const unitObj = SYLLABUS_UNITS.find(u => u.id === unitId);
      startSession({
        mode: "unit_practice",
        modeLabel: `Unit ${unitId} Practice`,
        isFullMock: false,
        unitFilter: unitId,
        durationSeconds: 20 * 60,
        feedbackTiming,
        shuffle: false
      });
    } else if (selectedConfigMode === "difficulty") {
      const diff = document.getElementById("cfg-diff").value;
      startSession({
        mode: "difficulty",
        modeLabel: `${diff} Difficulty Challenge`,
        isFullMock: false,
        diffFilter: diff,
        durationSeconds: 25 * 60,
        feedbackTiming,
        shuffle: true
      });
    } else if (selectedConfigMode === "rapid_fire") {
      const count = Number(document.getElementById("cfg-count").value);
      startSession({
        mode: "rapid_fire",
        modeLabel: `Rapid Fire (${count} Qs)`,
        isFullMock: false,
        limit: count,
        durationSeconds: count * 45,
        feedbackTiming,
        shuffle: true
      });
    } else if (selectedConfigMode === "mistake_revision") {
      const activeMistakes = state.mistakeIds.filter(id => !state.masteredMistakeIds.includes(id));
      if (!activeMistakes.length) {
        alert("No unmastered mistakes saved yet! Attempt a test first or unmark mastered questions in the Learning Centre.");
        return;
      }
      startSession({
        mode: "mistake_revision",
        modeLabel: "Mistake Revision Drill",
        isFullMock: false,
        onlyIds: activeMistakes,
        durationSeconds: activeMistakes.length * 60,
        feedbackTiming,
        shuffle: true
      });
    } else if (selectedConfigMode === "surprise") {
      const count = Number(document.getElementById("cfg-count").value);
      startSession({
        mode: "surprise",
        modeLabel: `Surprise Mixed Test (${count} Qs)`,
        isFullMock: false,
        limit: count,
        durationSeconds: count * 54,
        feedbackTiming,
        shuffle: true
      });
    }
  }

  /* -------------------- SCREEN 05 & 06: CBT & PRACTICE ENGINE -------------------- */
  function startSession(opts) {
    let pool = getQuestionBank();
    if (opts.unitFilter) pool = pool.filter(q => q.unit === opts.unitFilter);
    if (opts.diffFilter) pool = pool.filter(q => q.difficulty === opts.diffFilter);
    if (opts.onlyIds) {
      const set = new Set(opts.onlyIds);
      pool = pool.filter(q => set.has(q.id));
    }
    if (opts.shuffle) {
      pool = [...pool].sort(() => Math.random() - 0.5);
    }
    if (opts.isFullMock) {
      pool = pool.slice(0, 100);
    } else if (opts.limit) {
      pool = pool.slice(0, opts.limit);
    }

    if (!pool.length) {
      alert("No questions matched this configuration.");
      return;
    }

    activeSession = {
      id: `exam_${Date.now()}`,
      mode: opts.mode,
      modeLabel: opts.modeLabel,
      isFullMock: Boolean(opts.isFullMock),
      feedbackTiming: opts.isFullMock ? "end" : (opts.feedbackTiming || "immediate"),
      questions: pool,
      currentIndex: 0,
      responses: {}, // { [qId]: { selected: number|null, status: string, confidence: string|null, revealed: boolean } }
      durationSeconds: opts.durationSeconds || pool.length * 54,
      startTimestamp: Date.now(),
      isSubmitted: false
    };

    // Mark Q1 visited
    activeSession.responses[pool[0].id] = { selected: null, status: "not_answered", confidence: null, revealed: false };
    persistActiveSession();
    enterArena();
  }

  function checkResumeSavedExam() {
    try {
      const saved = localStorage.getItem(ACTIVE_EXAM_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && !parsed.isSubmitted && Array.isArray(parsed.questions) && parsed.questions.length) {
        if (confirm(`You have an unfinished "${parsed.modeLabel}" session. Resume where you left off?`)) {
          activeSession = parsed;
          enterArena();
        } else {
          localStorage.removeItem(ACTIVE_EXAM_KEY);
        }
      }
    } catch {
      localStorage.removeItem(ACTIVE_EXAM_KEY);
    }
  }

  function persistActiveSession() {
    if (activeSession && !activeSession.isSubmitted) {
      localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(activeSession));
    }
  }

  function enterArena() {
    navigateTo("arena");
    document.getElementById("arena-mode-badge").textContent = activeSession.modeLabel.toUpperCase();
    document.getElementById("confidence-box").classList.toggle("hidden", activeSession.isFullMock);
    document.getElementById("practice-tease-banner").classList.add("hidden");
    renderCurrentQuestion();
    renderPalette();
    startElapsedTimer();
  }

  function startElapsedTimer() {
    stopTimer();
    const updateClock = () => {
      if (!activeSession || activeSession.isSubmitted) return;
      const elapsedSec = Math.floor((Date.now() - activeSession.startTimestamp) / 1000);
      const remaining = Math.max(0, activeSession.durationSeconds - elapsedSec);
      const hrs = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      const secs = remaining % 60;
      const display = hrs > 0
        ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      const timerDisplay = document.getElementById("arena-timer-display");
      const timerBox = document.getElementById("arena-timer-box");
      timerDisplay.textContent = display;

      timerBox.classList.remove("timer-warn", "timer-danger");
      if (remaining <= 300) timerBox.classList.add("timer-danger");
      else if (remaining <= 600) timerBox.classList.add("timer-warn");

      if (remaining <= 0) {
        stopTimer();
        submitExamination(true);
      }
    };
    updateClock();
    timerInterval = setInterval(updateClock, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function renderCurrentQuestion() {
    const idx = activeSession.currentIndex;
    const q = activeSession.questions[idx];
    if (!activeSession.responses[q.id]) {
      activeSession.responses[q.id] = { selected: null, status: "not_answered", confidence: null, revealed: false };
    }
    const resp = activeSession.responses[q.id];

    document.getElementById("q-number-label").textContent = `Question ${idx + 1} of ${activeSession.questions.length}`;
    document.getElementById("mobile-pal-count").textContent = `${idx + 1}/${activeSession.questions.length}`;
    document.getElementById("arena-unit-badge").textContent = `Unit ${q.unit}`;
    document.getElementById("arena-diff-badge").textContent = q.difficulty;
    document.getElementById("arena-type-badge").textContent = q.type;
    document.getElementById("q-topic-label").textContent = q.topic;
    document.getElementById("q-text").textContent = q.question;

    // Confidence buttons state
    document.querySelectorAll(".conf-btn").forEach(btn => {
      btn.classList.toggle("active", resp.confidence === btn.dataset.conf);
    });

    const letters = ["A", "B", "C", "D"];
    const optionsContainer = document.getElementById("q-options-list");
    optionsContainer.innerHTML = q.options.map((opt, i) => {
      let cls = "option-item";
      if (resp.selected === i) cls += " selected";
      if (!activeSession.isFullMock && resp.revealed) {
        if (i === q.answer) cls += " opt-correct";
        else if (resp.selected === i && i !== q.answer) cls += " opt-wrong";
      }
      return `
        <button type="button" class="${cls}" data-opt-idx="${i}">
          <span class="opt-letter">${letters[i]}</span>
          <span>${opt}</span>
        </button>
      `;
    }).join("");

    optionsContainer.querySelectorAll(".option-item").forEach(btn => {
      btn.addEventListener("click", () => handleSelectOption(Number(btn.dataset.optIdx)));
    });

    const feedbackBox = document.getElementById("practice-instant-feedback");
    if (!activeSession.isFullMock && resp.revealed) {
      const isRight = resp.selected === q.answer;
      feedbackBox.classList.remove("hidden");
      feedbackBox.innerHTML = `
        <strong>${isRight ? "✓ Correct!" : `✕ Incorrect (Correct: Option ${letters[q.answer]})`}</strong>
        <p style="margin:0.4rem 0 0;">${q.explanation}</p>
        <small><em>Reference: ${q.reference || "OPSC ASO Modern India Syllabus"}</em></small>
      `;
    } else {
      feedbackBox.classList.add("hidden");
    }

    document.getElementById("btn-q-prev").disabled = idx === 0;
  }

  function handleSelectOption(optIdx) {
    const q = activeSession.questions[activeSession.currentIndex];
    const resp = activeSession.responses[q.id];
    if (!activeSession.isFullMock && resp.revealed && activeSession.feedbackTiming === "immediate") {
      return; // Lock answer once revealed in immediate feedback mode
    }
    resp.selected = optIdx;
    resp.status = resp.status === "marked" || resp.status === "ans_marked" ? "ans_marked" : "answered";

    if (!activeSession.isFullMock && activeSession.feedbackTiming === "immediate") {
      resp.revealed = true;
      maybeShowPracticeTease(optIdx === q.answer);
    }

    persistActiveSession();
    renderCurrentQuestion();
    renderPalette();
  }

  function maybeShowPracticeTease(isCorrect) {
    if (activeSession.isFullMock || state.profile.teaseFreq === "off") return;
    const chance = state.profile.teaseFreq === "moderate" ? 0.45 : 0.2;
    if (Math.random() > chance) return;

    const banner = document.getElementById("practice-tease-banner");
    const customList = state.admin.teaseMessages;
    const msg = isCorrect
      ? `Nice pick, ${state.profile.name}! Keep that accuracy sharp.`
      : customList[Math.floor(Math.random() * customList.length)];
    banner.textContent = msg;
    banner.classList.remove("hidden");
  }

  function initArenaControls() {
    document.querySelectorAll(".conf-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!activeSession) return;
        const q = activeSession.questions[activeSession.currentIndex];
        const resp = activeSession.responses[q.id];
        resp.confidence = resp.confidence === btn.dataset.conf ? null : btn.dataset.conf;
        persistActiveSession();
        renderCurrentQuestion();
      });
    });

    document.getElementById("btn-q-prev").addEventListener("click", () => {
      if (activeSession.currentIndex > 0) {
        jumpToQuestion(activeSession.currentIndex - 1);
      }
    });

    document.getElementById("btn-q-clear").addEventListener("click", () => {
      const q = activeSession.questions[activeSession.currentIndex];
      const resp = activeSession.responses[q.id];
      if (!activeSession.isFullMock && resp.revealed) return;
      resp.selected = null;
      resp.status = "not_answered";
      persistActiveSession();
      renderCurrentQuestion();
      renderPalette();
    });

    document.getElementById("btn-q-mark").addEventListener("click", () => {
      const q = activeSession.questions[activeSession.currentIndex];
      const resp = activeSession.responses[q.id];
      resp.status = resp.selected !== null ? "ans_marked" : "marked";
      persistActiveSession();
      advanceQuestion();
    });

    document.getElementById("btn-q-save-next").addEventListener("click", () => {
      const q = activeSession.questions[activeSession.currentIndex];
      const resp = activeSession.responses[q.id];
      if (resp.selected !== null && resp.status !== "ans_marked") {
        resp.status = "answered";
      } else if (resp.selected === null && resp.status !== "marked") {
        resp.status = "not_answered";
      }
      persistActiveSession();
      advanceQuestion();
    });

    document.getElementById("btn-toggle-palette").addEventListener("click", () => {
      document.getElementById("arena-palette-drawer").classList.add("open");
    });
    document.getElementById("btn-close-palette").addEventListener("click", () => {
      document.getElementById("arena-palette-drawer").classList.remove("open");
    });

    const requestSubmit = () => {
      const counts = getPaletteCounts();
      const msg = `Submit "${activeSession.modeLabel}" now?\n\nAnswered: ${counts.answered + counts.ansMarked}\nNot Answered: ${counts.notAnswered}\nMarked for Review: ${counts.marked + counts.ansMarked}\nNot Visited: ${counts.notVisited}`;
      if (confirm(msg)) submitExamination(false);
    };

    document.getElementById("btn-submit-exam").addEventListener("click", requestSubmit);
    document.getElementById("btn-palette-submit").addEventListener("click", requestSubmit);
  }

  function advanceQuestion() {
    // Checkpoint feedback after every 5 questions in Practice Mode
    if (!activeSession.isFullMock && activeSession.feedbackTiming === "every5") {
      const nextIdx = activeSession.currentIndex + 1;
      if (nextIdx > 0 && nextIdx % 5 === 0) {
        const block = activeSession.questions.slice(nextIdx - 5, nextIdx);
        let right = 0;
        block.forEach(bq => {
          const r = activeSession.responses[bq.id];
          if (r) r.revealed = true;
          if (r && r.selected === bq.answer) right++;
        });
        alert(`5-Question Checkpoint!\nYou got ${right} out of 5 right in this set. Keep going!`);
      }
    }

    if (activeSession.currentIndex < activeSession.questions.length - 1) {
      jumpToQuestion(activeSession.currentIndex + 1);
    } else {
      renderPalette();
      alert("You have reached the last question. Click 'Submit' when ready to evaluate.");
    }
  }

  function jumpToQuestion(index) {
    activeSession.currentIndex = index;
    const q = activeSession.questions[index];
    if (!activeSession.responses[q.id]) {
      activeSession.responses[q.id] = { selected: null, status: "not_answered", confidence: null, revealed: false };
    }
    document.getElementById("arena-palette-drawer").classList.remove("open");
    persistActiveSession();
    renderCurrentQuestion();
    renderPalette();
  }

  function getPaletteCounts() {
    let notVisited = 0, notAnswered = 0, answered = 0, marked = 0, ansMarked = 0;
    activeSession.questions.forEach(q => {
      const r = activeSession.responses[q.id];
      if (!r) notVisited++;
      else if (r.status === "answered") answered++;
      else if (r.status === "marked") marked++;
      else if (r.status === "ans_marked") ansMarked++;
      else notAnswered++;
    });
    return { notVisited, notAnswered, answered, marked, ansMarked };
  }

  function renderPalette() {
    const counts = getPaletteCounts();
    document.getElementById("palette-summary").innerHTML = `
      <span>🟢 Answered: <strong>${counts.answered}</strong></span>
      <span>🔴 Not Ans: <strong>${counts.notAnswered}</strong></span>
      <span>🟣 Marked: <strong>${counts.marked}</strong></span>
      <span>🟣✓ Ans+Mark: <strong>${counts.ansMarked}</strong></span>
      <span>⚪ Not Visited: <strong>${counts.notVisited}</strong></span>
    `;

    const grid = document.getElementById("palette-grid");
    grid.innerHTML = activeSession.questions.map((q, idx) => {
      const r = activeSession.responses[q.id];
      let stClass = "st-not-visited";
      if (r) {
        if (r.status === "answered") stClass = "st-answered";
        else if (r.status === "marked") stClass = "st-marked";
        else if (r.status === "ans_marked") stClass = "st-ans-marked";
        else stClass = "st-not-answered";
      }
      const curClass = idx === activeSession.currentIndex ? " current" : "";
      return `<button type="button" class="pal-btn ${stClass}${curClass}" data-jump="${idx}">${idx + 1}</button>`;
    }).join("");

    grid.querySelectorAll(".pal-btn").forEach(btn => {
      btn.addEventListener("click", () => jumpToQuestion(Number(btn.dataset.jump)));
    });
  }

  /* -------------------- SCORING & RESULT REVEAL SEQUENCE -------------------- */
  function submitExamination(isAutoTimeout) {
    if (!activeSession || activeSession.isSubmitted) return;
    activeSession.isSubmitted = true;
    stopTimer();
    localStorage.removeItem(ACTIVE_EXAM_KEY);

    const elapsedSec = Math.min(
      activeSession.durationSeconds,
      Math.max(1, Math.floor((Date.now() - activeSession.startTimestamp) / 1000))
    );

    let correct = 0, wrong = 0, skipped = 0;
    const unitStats = {};
    const formatStats = {};
    const diffStats = {};
    const unitsCovered = new Set();
    const mistakeSet = new Set(state.mistakeIds);
    const detailedAnswers = [];

    activeSession.questions.forEach(q => {
      unitsCovered.add(q.unit);
      if (!unitStats[q.unit]) unitStats[q.unit] = { total: 0, correct: 0, wrong: 0 };
      if (!formatStats[q.type]) formatStats[q.type] = { total: 0, correct: 0 };
      if (!diffStats[q.difficulty]) diffStats[q.difficulty] = { total: 0, correct: 0 };

      unitStats[q.unit].total++;
      formatStats[q.type].total++;
      diffStats[q.difficulty].total++;

      const r = activeSession.responses[q.id];
      const userOpt = r ? r.selected : null;
      let outcome = "skipped";

      if (userOpt === null || userOpt === undefined) {
        skipped++;
        mistakeSet.add(q.id);
      } else if (userOpt === q.answer) {
        correct++;
        unitStats[q.unit].correct++;
        formatStats[q.type].correct++;
        diffStats[q.difficulty].correct++;
        outcome = "correct";
      } else {
        wrong++;
        unitStats[q.unit].wrong++;
        mistakeSet.add(q.id);
        outcome = "wrong";
      }

      detailedAnswers.push({ q, userOpt, outcome });
    });

    const totalQuestions = activeSession.questions.length;
    const grossMarks = correct * 1.0;
    const negativeMarks = wrong * 0.25;
    const netScore = Number((grossMarks - negativeMarks).toFixed(2));
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const attemptRate = Math.round((attempted / totalQuestions) * 100);

    const record = {
      id: activeSession.id,
      date: todayStr(),
      timestamp: new Date().toISOString(),
      mode: activeSession.mode,
      modeLabel: activeSession.modeLabel,
      isFullMock: activeSession.isFullMock,
      totalQuestions,
      correct,
      wrong,
      skipped,
      grossMarks,
      negativeMarks,
      netScore,
      accuracy,
      attemptRate,
      elapsedSec,
      unitStats,
      formatStats,
      diffStats,
      unitsCovered: [...unitsCovered],
      isAutoTimeout
    };

    state.attempts.unshift(record);
    state.mistakeIds = [...mistakeSet];
    if (!state.studyDates.includes(record.date)) state.studyDates.push(record.date);

    const newlyUnlocked = evaluateAchievements(record);
    saveState();

    lastCompletedResult = { record, detailedAnswers, newlyUnlocked };
    activeSession = null;
    renderResultScreen(lastCompletedResult);
  }

  function evaluateAchievements(record) {
    const unlocked = new Set(state.unlockedAchievements);
    const fresh = [];
    const unlock = id => {
      if (!unlocked.has(id)) {
        unlocked.add(id);
        const badge = DEFAULT_ACHIEVEMENTS.find(b => b.id === id);
        if (badge) fresh.push(badge);
      }
    };

    if (state.attempts.length >= 1) unlock("first_step");
    if (record.isFullMock) unlock("full_warrior");
    if (record.isFullMock && record.netScore >= 35) unlock("cutoff_clear");
    if (record.isFullMock && record.netScore >= 70) unlock("high_flyer");
    if (calculateStreak() >= 3) unlock("streak_3");
    if (record.unitStats[5] && record.unitStats[5].total >= 5) {
      const u5Acc = (record.unitStats[5].correct / record.unitStats[5].total) * 100;
      if (u5Acc >= 80) unlock("odisha_pride");
    }

    state.unlockedAchievements = [...unlocked];
    return fresh;
  }

  function renderResultScreen({ record, detailedAnswers, newlyUnlocked }) {
    navigateTo("results");

    document.getElementById("res-mode-title").textContent = `${record.modeLabel.toUpperCase()} RESULT`;
    document.getElementById("res-max-score").textContent = `out of ${record.totalQuestions}`;
    document.getElementById("res-date-label").textContent = record.date;

    // Step 2: Animated score reveal
    const scoreEl = document.getElementById("res-animated-score");
    let frame = 0;
    const totalFrames = 24;
    const anim = setInterval(() => {
      frame++;
      const val = (record.netScore * (frame / totalFrames));
      scoreEl.textContent = val.toFixed(2);
      if (frame >= totalFrames) {
        scoreEl.textContent = record.netScore.toFixed(2);
        clearInterval(anim);
      }
    }, 28);

    // Practice benchmark check
    const pctScore = (record.netScore / record.totalQuestions) * 100;
    const benchEl = document.getElementById("res-benchmark-badge");
    if (pctScore >= 35) {
      benchEl.textContent = "Practice Benchmark: Above 35% Qualifying Threshold ✓";
    } else if (pctScore >= 30) {
      benchEl.textContent = "Practice Benchmark: Above 30% Reserved Threshold (Target 35%+ for UR/SEBC)";
    } else {
      benchEl.textContent = "Practice Benchmark: Below 30% — Review Explanations & Retry Mistakes";
    }

    // Step 3: Official-style scorecard
    document.getElementById("res-gross").textContent = `+${record.grossMarks.toFixed(2)}`;
    document.getElementById("res-negative").textContent = `-${record.negativeMarks.toFixed(2)}`;
    document.getElementById("res-correct").textContent = record.correct;
    document.getElementById("res-wrong").textContent = record.wrong;
    document.getElementById("res-skipped").textContent = record.skipped;
    document.getElementById("res-accuracy").textContent = `${record.accuracy}%`;
    const mins = Math.floor(record.elapsedSec / 60);
    const secs = record.elapsedSec % 60;
    document.getElementById("res-time").textContent = `${mins}m ${secs}s`;
    document.getElementById("res-attempt-rate").textContent = `${record.attemptRate}%`;

    // Step 4: Performance analytics bars
    document.getElementById("res-unit-bars").innerHTML = Object.entries(record.unitStats).map(([uId, st]) => {
      const uObj = SYLLABUS_UNITS.find(u => u.id === Number(uId));
      const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
      return renderProgressRow(`Unit ${uId}: ${uObj ? uObj.title : ""}`, `${st.correct}/${st.total} (${pct}%)`, pct);
    }).join("");

    document.getElementById("res-format-bars").innerHTML = Object.entries(record.formatStats).map(([fmt, st]) => {
      const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
      return renderProgressRow(fmt, `${st.correct}/${st.total} (${pct}%)`, pct);
    }).join("");

    document.getElementById("res-diff-bars").innerHTML = Object.entries(record.diffStats).map(([diff, st]) => {
      const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
      return renderProgressRow(diff, `${st.correct}/${st.total} (${pct}%)`, pct);
    }).join("");

    // Step 5: Achievement unlock
    const achBox = document.getElementById("res-achievements-box");
    if (newlyUnlocked.length) {
      achBox.classList.remove("hidden");
      document.getElementById("res-unlocked-list").innerHTML = newlyUnlocked.map(b =>
        `<div class="badge badge-gold" style="margin:0.25rem;">${b.icon} ${b.title}</div>`
      ).join("");
    } else {
      achBox.classList.add("hidden");
    }

    // Step 6: Personal Letter after scorecard
    let letterText = "";
    if (pctScore >= 70) {
      letterText = `Outstanding composure, ${state.profile.name}! Scoring ${record.netScore.toFixed(2)} with ${record.accuracy}% accuracy shows genuine OPSC ASO command. Take a short break, celebrate this milestone, and keep polishing your edge.`;
    } else if (pctScore >= 45) {
      letterText = `Solid progress, ${state.profile.name}! You scored ${record.netScore.toFixed(2)}. Notice how ${record.wrong} wrong answers deducted ${record.negativeMarks.toFixed(2)} marks—tightening your elimination on tricky statements will push you straight past 65+.`;
    } else {
      letterText = `Every single attempt builds your foundation, ${state.profile.name}. Don't let ${record.netScore.toFixed(2)} discourage you—open the Answer Key below, read the explanations for your ${record.wrong + record.skipped} missed questions, and watch your next score jump!`;
    }
    document.getElementById("res-personal-letter").textContent = letterText;

    // Step 7: Next preparation recommendation
    const weakness = computeWeaknessAnalysis();
    document.getElementById("res-next-recommendation").textContent = weakness.summaryText;

    // Review list setup
    renderResultReviewList(detailedAnswers, "all");
    document.getElementById("res-review-drawer").classList.add("hidden");
  }

  function renderProgressRow(label, rightText, pct) {
    return `
      <div>
        <div class="bk-row-top"><span>${label}</span><strong>${rightText}</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
      </div>
    `;
  }

  function renderResultReviewList(detailedAnswers, filter) {
    const letters = ["A", "B", "C", "D"];
    const filtered = detailedAnswers.filter(item => filter === "all" || item.outcome === filter);
    const listEl = document.getElementById("res-review-list");
    if (!filtered.length) {
      listEl.innerHTML = `<p>No questions under the "${filter}" filter.</p>`;
      return;
    }
    listEl.innerHTML = filtered.map((item, idx) => {
      const { q, userOpt, outcome } = item;
      return `
        <div class="review-item">
          <div class="review-item-meta">
            <span class="badge">Q#${q.id} • Unit ${q.unit}</span>
            <span class="badge badge-outline">${q.difficulty}</span>
            <span class="badge badge-outline">${q.type}</span>
            <span class="badge">${outcome.toUpperCase()}</span>
          </div>
          <div class="q-text" style="font-size:0.96rem;">${idx + 1}. ${q.question}</div>
          <div class="review-opts">
            ${q.options.map((opt, i) => {
              let c = "rev-opt";
              if (i === q.answer) c += " is-right";
              else if (i === userOpt && userOpt !== q.answer) c += " is-user-wrong";
              return `<div class="${c}"><strong>${letters[i]}.</strong> ${opt}</div>`;
            }).join("")}
          </div>
          <div class="rev-exp">
            <strong>Explanation:</strong> ${q.explanation}<br/>
            <small><em>Ref: ${q.reference || "OPSC ASO Syllabus"}</em></small>
          </div>
        </div>
      `;
    }).join("");
  }

  function initResultControls() {
    document.querySelectorAll("#res-review-filters .pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#res-review-filters .pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (lastCompletedResult) renderResultReviewList(lastCompletedResult.detailedAnswers, btn.dataset.rfilter);
      });
    });

    document.getElementById("btn-res-review-all").addEventListener("click", () => {
      const drawer = document.getElementById("res-review-drawer");
      drawer.classList.toggle("hidden");
      drawer.scrollIntoView({ behavior: "smooth" });
    });

    document.getElementById("btn-res-retry-full").addEventListener("click", () => {
      if (!lastCompletedResult) return;
      const rec = lastCompletedResult.record;
      startSession({
        mode: rec.mode,
        modeLabel: rec.modeLabel,
        isFullMock: rec.isFullMock,
        durationSeconds: rec.isFullMock ? 90 * 60 : rec.totalQuestions * 54,
        feedbackTiming: rec.isFullMock ? "end" : state.profile.defaultFeedback,
        shuffle: !rec.isFullMock
      });
    });

    document.getElementById("btn-res-retry-wrong").addEventListener("click", () => {
      if (!lastCompletedResult) return;
      const missedIds = lastCompletedResult.detailedAnswers
        .filter(a => a.outcome !== "correct")
        .map(a => a.q.id);
      if (!missedIds.length) {
        alert("Zero incorrect or skipped questions in this attempt—flawless run!");
        return;
      }
      startSession({
        mode: "mistake_revision",
        modeLabel: "Retry Missed Questions",
        isFullMock: false,
        onlyIds: missedIds,
        durationSeconds: missedIds.length * 60,
        feedbackTiming: "immediate",
        shuffle: true
      });
    });

    document.getElementById("btn-res-download-scorecard").addEventListener("click", () => window.print());

    document.getElementById("btn-res-certificate").addEventListener("click", () => {
      if (!lastCompletedResult) return;
      const r = lastCompletedResult.record;
      document.getElementById("cert-candidate-name").textContent = state.profile.name;
      document.getElementById("cert-description").textContent = `has completed "${r.modeLabel}" under the OPSC ASO 1915–1947+ Preparation Programme`;
      document.getElementById("cert-score").textContent = `${r.netScore.toFixed(2)} / ${r.totalQuestions}`;
      document.getElementById("cert-accuracy").textContent = `${r.accuracy}%`;
      document.getElementById("cert-date").textContent = r.date;
      document.getElementById("cert-sign").textContent = state.admin.organiserName;
      document.getElementById("certificate-modal").classList.remove("hidden");
    });

    document.getElementById("btn-print-certificate").addEventListener("click", () => window.print());
    document.getElementById("btn-close-certificate").addEventListener("click", () => {
      document.getElementById("certificate-modal").classList.add("hidden");
    });

    document.getElementById("btn-res-dashboard").addEventListener("click", () => navigateTo("dashboard"));
  }

  /* -------------------- 03. LEARNING CENTRE & MISTAKE NOTEBOOK -------------------- */
  function renderLearningCentre() {
    const bank = getQuestionBank();
    const activeMistakes = state.mistakeIds.filter(id => !state.masteredMistakeIds.includes(id));
    document.getElementById("mistake-count-label").textContent = activeMistakes.length;

    const unitVal = document.getElementById("learn-unit-filter").value;
    const diffVal = document.getElementById("learn-diff-filter").value;
    const typeVal = document.getElementById("learn-type-filter").value;
    const mistakesOnly = document.getElementById("learn-mistakes-only").checked;
    const query = document.getElementById("learn-search-input").value.trim().toLowerCase();

    const mistakeSet = new Set(activeMistakes);
    const filtered = bank.filter(q => {
      if (unitVal !== "all" && q.unit !== Number(unitVal)) return false;
      if (diffVal !== "all" && q.difficulty !== diffVal) return false;
      if (typeVal !== "all" && q.type !== typeVal) return false;
      if (mistakesOnly && !mistakeSet.has(q.id)) return false;
      if (query) {
        const hay = `${q.question} ${q.topic} ${q.explanation} ${q.options.join(" ")}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const letters = ["A", "B", "C", "D"];
    const container = document.getElementById("learning-questions-list");
    if (!filtered.length) {
      container.innerHTML = `<div class="card"><p>No questions match your current filters.</p></div>`;
      return;
    }

    container.innerHTML = filtered.map(q => {
      const isMistake = mistakeSet.has(q.id);
      return `
        <div class="review-item">
          <div class="card-header" style="margin-bottom:0.4rem;">
            <div class="review-item-meta" style="margin:0;">
              <span class="badge">Q${q.id} • Unit ${q.unit}</span>
              <span class="badge badge-outline">${q.topic}</span>
              <span class="badge badge-outline">${q.difficulty}</span>
              <span class="badge badge-outline">${q.type}</span>
            </div>
            ${isMistake ? `<button class="btn btn-xs btn-secondary btn-master-mistake" data-qid="${q.id}">Mark Mastered ✓</button>` : ""}
          </div>
          <div class="q-text" style="font-size:0.96rem;">${q.question}</div>
          <div class="review-opts">
            ${q.options.map((opt, i) => `
              <div class="rev-opt ${i === q.answer ? "is-right" : ""}">
                <strong>${letters[i]}.</strong> ${opt}
              </div>
            `).join("")}
          </div>
          <div class="rev-exp">
            <strong>Verified Explanation:</strong> ${q.explanation}<br/>
            <small><em>Reference: ${q.reference || "OPSC ASO Modern History Syllabus"}</em></small>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".btn-master-mistake").forEach(btn => {
      btn.addEventListener("click", () => {
        const qid = Number(btn.dataset.qid);
        if (!state.masteredMistakeIds.includes(qid)) {
          state.masteredMistakeIds.push(qid);
          saveState();
          renderLearningCentre();
        }
      });
    });
  }

  function initLearningFilters() {
    ["learn-unit-filter", "learn-diff-filter", "learn-type-filter", "learn-mistakes-only"].forEach(id => {
      document.getElementById(id).addEventListener("change", renderLearningCentre);
    });
    document.getElementById("learn-search-input").addEventListener("input", renderLearningCentre);
  }

  /* -------------------- 04. MY PROGRESS, WEAKNESS REPORT & CALENDAR -------------------- */
  function computeWeaknessAnalysis() {
    if (!state.attempts.length) {
      return {
        weakestUnit: 1,
        summaryText: "Unit 1: Arrival of Gandhi & Early Mass Movements (1915–1927) — Start here to build momentum."
      };
    }
    const agg = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 }, 4: { c: 0, t: 0 }, 5: { c: 0, t: 0 } };
    state.attempts.forEach(a => {
      Object.entries(a.unitStats || {}).forEach(([u, st]) => {
        if (agg[u]) {
          agg[u].c += st.correct;
          agg[u].t += st.total;
        }
      });
    });

    let weakestId = 1;
    let lowestPct = 101;
    SYLLABUS_UNITS.forEach(u => {
      const pct = agg[u.id].t ? Math.round((agg[u.id].c / agg[u.id].t) * 100) : 0;
      if (pct < lowestPct) {
        lowestPct = pct;
        weakestId = u.id;
      }
    });
    const weakObj = SYLLABUS_UNITS.find(u => u.id === weakestId);
    return {
      weakestUnit: weakestId,
      lowestPct,
      agg,
      summaryText: `Unit ${weakestId}: ${weakObj.title} (${lowestPct}% cumulative accuracy) — Recommended next revision focus.`
    };
  }

  function renderProgressSection() {
    const weakness = computeWeaknessAnalysis();
    document.getElementById("weakness-report-body").innerHTML = `
      <p><strong>Priority Focus:</strong> ${weakness.summaryText}</p>
      ${weakness.agg ? SYLLABUS_UNITS.map(u => {
        const st = weakness.agg[u.id];
        const pct = st.t ? Math.round((st.c / st.t) * 100) : 0;
        return renderProgressRow(`Unit ${u.id}: ${u.title}`, `${st.c}/${st.t} (${pct}%)`, pct);
      }).join("") : ""}
    `;

    // Render Monthly Calendar
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    document.getElementById("calendar-month-label").textContent = now.toLocaleString("default", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activeSet = new Set(state.studyDates);
    const today = todayStr();

    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="cal-head">${d}</div>`).join("");
    let cells = "";
    for (let i = 0; i < firstDay; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      let cls = "cal-cell";
      if (activeSet.has(key)) cls += " active";
      if (key === today) cls += " today";
      cells += `<div class="${cls}">${d}</div>`;
    }
    document.getElementById("study-calendar-grid").innerHTML = dayHeaders + cells;

    // Attempt history
    const histEl = document.getElementById("attempt-history-list");
    if (!state.attempts.length) {
      histEl.innerHTML = `<p>No examination or practice history recorded yet.</p>`;
    } else {
      histEl.innerHTML = state.attempts.map(a => `
        <div class="admin-row">
          <div>
            <strong>${a.modeLabel}</strong> <span class="badge">${a.date}</span><br/>
            <small>Correct: ${a.correct} | Wrong: ${a.wrong} | Skipped: ${a.skipped} | Accuracy: ${a.accuracy}%</small>
          </div>
          <strong>${a.netScore.toFixed(2)} / ${a.totalQuestions}</strong>
        </div>
      `).join("");
    }
  }

  /* -------------------- 05. ACHIEVEMENTS & 06. MOTIVATION CORNER -------------------- */
  function renderAchievementsSection() {
    const unlockedSet = new Set(state.unlockedAchievements);
    document.getElementById("achievements-grid").innerHTML = DEFAULT_ACHIEVEMENTS.map(b => {
      const isUnlocked = unlockedSet.has(b.id);
      return `
        <div class="badge-card ${isUnlocked ? "" : "locked"}">
          <span class="badge-icon">${isUnlocked ? b.icon : "🔒"}</span>
          <span class="badge">${isUnlocked ? "UNLOCKED" : "LOCKED"}</span>
          <h3 style="margin:0.4rem 0 0.25rem;">${b.title}</h3>
          <p style="font-size:0.86rem;">${b.desc}</p>
          ${isUnlocked ? `<div class="quote-box" style="margin:0;font-size:0.84rem;">${b.secretNote}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  function renderMotivationSection() {
    const fullMocks = state.attempts.filter(a => a.isFullMock);
    const bestScore = fullMocks.length ? Math.max(...fullMocks.map(a => a.netScore)) : 0;

    document.getElementById("letters-grid").innerHTML = state.admin.secretLetters.map(lt => {
      const unlocked = fullMocks.length >= (lt.minMocks || 0) && bestScore >= (lt.minScore || 0);
      return `
        <div class="card">
          <div class="card-header">
            <h3>${unlocked ? "💌" : "🔒"} ${lt.title}</h3>
            <span class="badge">${unlocked ? "Unlocked" : lt.unlockRule}</span>
          </div>
          <p class="letter-body">${unlocked ? lt.body : `Keep going! Unlock condition: ${lt.unlockRule}.`}</p>
        </div>
      `;
    }).join("");
  }

  /* -------------------- 07. CANDIDATE PROFILE -------------------- */
  function renderProfileSection() {
    document.getElementById("prof-name").value = state.profile.name;
    document.getElementById("prof-target-exam").value = state.profile.targetExam;
    document.getElementById("prof-target-score").value = state.profile.targetScore;
    document.getElementById("prof-daily-goal").value = state.profile.dailyGoal;
    document.getElementById("prof-tease-freq").value = state.profile.teaseFreq;
    document.getElementById("prof-default-feedback").value = state.profile.defaultFeedback;
  }

  function initProfileForm() {
    document.getElementById("profile-form").addEventListener("submit", e => {
      e.preventDefault();
      state.profile.name = document.getElementById("prof-name").value.trim() || "Future ASO";
      state.profile.targetExam = document.getElementById("prof-target-exam").value.trim() || "OPSC ASO";
      state.profile.targetScore = Number(document.getElementById("prof-target-score").value) || 75;
      state.profile.dailyGoal = Number(document.getElementById("prof-daily-goal").value) || 20;
      state.profile.teaseFreq = document.getElementById("prof-tease-freq").value;
      state.profile.defaultFeedback = document.getElementById("prof-default-feedback").value;
      saveState();
      alert("Candidate preferences saved!");
    });
  }

  /* -------------------- 08. ORGANISER CONTROL PANEL & BACKUPS -------------------- */
  function renderOrganiserSection() {
    document.getElementById("admin-lock-card").classList.toggle("hidden", adminUnlocked);
    document.getElementById("admin-workspace").classList.toggle("hidden", !adminUnlocked);
    if (!adminUnlocked) return;

    const bank = getQuestionBank();
    document.getElementById("admin-stats-grid").innerHTML = `
      <div class="stat-card"><span class="stat-label">Active Bank</span><strong class="stat-value">${bank.length}</strong><span class="stat-sub">Total MCQs</span></div>
      <div class="stat-card"><span class="stat-label">Saved Attempts</span><strong class="stat-value">${state.attempts.length}</strong><span class="stat-sub">Mocks & Practice</span></div>
      <div class="stat-card"><span class="stat-label">Mistake Queue</span><strong class="stat-value">${state.mistakeIds.length}</strong><span class="stat-sub">Tracked IDs</span></div>
      <div class="stat-card"><span class="stat-label">Achievements</span><strong class="stat-value">${state.unlockedAchievements.length}/${DEFAULT_ACHIEVEMENTS.length}</strong><span class="stat-sub">Unlocked</span></div>
    `;

    renderAdminQuestionsList();
    renderAdminMessages();
    document.getElementById("as-new-pin").value = state.admin.pin;
    document.getElementById("as-organiser-name").value = state.admin.organiserName;
  }

  function renderAdminQuestionsList() {
    const bank = getQuestionBank();
    const qFilter = (document.getElementById("admin-q-search").value || "").toLowerCase();
    const list = bank.filter(q => !qFilter || String(q.id).includes(qFilter) || q.question.toLowerCase().includes(qFilter));

    document.getElementById("admin-q-list").innerHTML = list.slice(0, 40).map(q => `
      <div class="admin-row">
        <div>
          <strong>Q${q.id} [Unit ${q.unit} • ${q.difficulty} • ${q.type}]</strong><br/>
          <small>${q.question.slice(0, 95)}${q.question.length > 95 ? "..." : ""}</small>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-xs btn-secondary btn-edit-q" data-qid="${q.id}">Edit</button>
          <button type="button" class="btn btn-xs btn-danger btn-del-q" data-qid="${q.id}">Delete</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".btn-edit-q").forEach(btn => {
      btn.addEventListener("click", () => {
        const q = getQuestionBank().find(item => item.id === Number(btn.dataset.qid));
        if (!q) return;
        document.getElementById("aq-id").value = q.id;
        document.getElementById("aq-unit").value = q.unit;
        document.getElementById("aq-topic").value = q.topic;
        document.getElementById("aq-difficulty").value = q.difficulty;
        document.getElementById("aq-type").value = q.type;
        document.getElementById("aq-question").value = q.question;
        q.options.forEach((o, i) => { document.getElementById(`aq-opt-${i}`).value = o; });
        document.getElementById("aq-answer").value = q.answer;
        document.getElementById("aq-ref").value = q.reference || "";
        document.getElementById("aq-explanation").value = q.explanation;
        document.getElementById("q-form-heading").textContent = `Editing Question #${q.id}`;
        document.getElementById("admin-question-form").scrollIntoView({ behavior: "smooth" });
      });
    });

    document.querySelectorAll(".btn-del-q").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.qid);
        if (!confirm(`Delete Question #${id}?`)) return;
        if (!state.deletedQuestionIds.includes(id)) state.deletedQuestionIds.push(id);
        state.customQuestions = state.customQuestions.filter(q => q.id !== id);
        saveState();
        renderAdminQuestionsList();
      });
    });
  }

  function renderAdminMessages() {
    document.getElementById("am-welcome-title").value = state.admin.welcomeTitle;
    document.getElementById("am-welcome-body").value = state.admin.welcomeBody;
    document.getElementById("admin-tease-list").innerHTML = state.admin.teaseMessages.map((msg, idx) => `
      <div class="admin-row">
        <span>${msg}</span>
        <button type="button" class="btn btn-xs btn-danger btn-del-tease" data-tidx="${idx}">Remove</button>
      </div>
    `).join("");

    document.querySelectorAll(".btn-del-tease").forEach(btn => {
      btn.addEventListener("click", () => {
        state.admin.teaseMessages.splice(Number(btn.dataset.tidx), 1);
        saveState();
        renderAdminMessages();
      });
    });
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportJsonBackup(scope) {
    let payload = { app: "PROJECT_ASO", version: "2.0", exportedAt: new Date().toISOString(), scope };
    if (scope === "all") payload.data = state;
    else if (scope === "attempts") payload.data = { attempts: state.attempts, studyDates: state.studyDates };
    else if (scope === "achievements") payload.data = { unlockedAchievements: state.unlockedAchievements };
    else if (scope === "preferences") payload.data = { profile: state.profile };

    state.lastBackupExport = new Date().toISOString();
    saveState();
    document.getElementById("backup-reminder-bar").classList.add("hidden");
    downloadFile(`project-aso-backup-${scope}-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function initOrganiserControls() {
    document.getElementById("btn-unlock-admin").addEventListener("click", () => {
      const pin = document.getElementById("admin-pin-input").value.trim();
      if (pin === state.admin.pin) {
        adminUnlocked = true;
        document.getElementById("admin-pin-input").value = "";
        renderOrganiserSection();
      } else {
        alert("Incorrect Organiser PIN.");
      }
    });

    document.getElementById("btn-lock-admin").addEventListener("click", () => {
      adminUnlocked = false;
      renderOrganiserSection();
    });

    document.querySelectorAll("#admin-tabs .pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#admin-tabs .pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.add("hidden"));
        document.getElementById(`atab-${btn.dataset.atab}`).classList.remove("hidden");
      });
    });

    document.getElementById("admin-q-search").addEventListener("input", renderAdminQuestionsList);

    document.getElementById("admin-question-form").addEventListener("submit", e => {
      e.preventDefault();
      const bank = getQuestionBank();
      const existingId = Number(document.getElementById("aq-id").value);
      const nextId = existingId || (bank.length ? Math.max(...bank.map(q => q.id)) + 1 : 1);
      const ans = Number(document.getElementById("aq-answer").value);
      if (![0, 1, 2, 3].includes(ans)) {
        alert("Validation Error: Exactly one valid option (A–D) must be set as the correct answer.");
        return;
      }

      const newObj = {
        id: nextId,
        unit: Number(document.getElementById("aq-unit").value),
        topic: document.getElementById("aq-topic").value.trim(),
        difficulty: document.getElementById("aq-difficulty").value,
        type: document.getElementById("aq-type").value,
        question: document.getElementById("aq-question").value.trim(),
        options: [
          document.getElementById("aq-opt-0").value.trim(),
          document.getElementById("aq-opt-1").value.trim(),
          document.getElementById("aq-opt-2").value.trim(),
          document.getElementById("aq-opt-3").value.trim()
        ],
        answer: ans,
        reference: document.getElementById("aq-ref").value.trim(),
        explanation: document.getElementById("aq-explanation").value.trim()
      };

      state.customQuestions = state.customQuestions.filter(q => q.id !== nextId);
      state.customQuestions.push(newObj);
      state.deletedQuestionIds = state.deletedQuestionIds.filter(id => id !== nextId);
      saveState();

      e.target.reset();
      document.getElementById("aq-id").value = "";
      document.getElementById("q-form-heading").textContent = "Add / Edit Question";
      renderAdminQuestionsList();
      alert(`Question #${nextId} saved!`);
    });

    document.getElementById("btn-aq-reset").addEventListener("click", () => {
      document.getElementById("admin-question-form").reset();
      document.getElementById("aq-id").value = "";
      document.getElementById("q-form-heading").textContent = "Add / Edit Question";
    });

    document.getElementById("btn-add-tease").addEventListener("click", () => {
      const val = document.getElementById("am-new-tease").value.trim();
      if (!val) return;
      state.admin.teaseMessages.push(val);
      document.getElementById("am-new-tease").value = "";
      saveState();
      renderAdminMessages();
    });

    document.getElementById("admin-msg-form").addEventListener("submit", e => {
      e.preventDefault();
      state.admin.welcomeTitle = document.getElementById("am-welcome-title").value.trim() || DEFAULT_STATE.admin.welcomeTitle;
      state.admin.welcomeBody = document.getElementById("am-welcome-body").value.trim() || DEFAULT_STATE.admin.welcomeBody;
      saveState();
      alert("Messages updated!");
    });

    document.getElementById("btn-save-admin-settings").addEventListener("click", () => {
      const newPin = document.getElementById("as-new-pin").value.trim();
      if (newPin.length >= 4) state.admin.pin = newPin;
      state.admin.organiserName = document.getElementById("as-organiser-name").value.trim() || DEFAULT_STATE.admin.organiserName;
      saveState();
      alert("Organiser settings saved!");
    });

    document.getElementById("btn-exp-all").addEventListener("click", () => exportJsonBackup("all"));
    document.getElementById("btn-exp-attempts").addEventListener("click", () => exportJsonBackup("attempts"));
    document.getElementById("btn-exp-achievements").addEventListener("click", () => exportJsonBackup("achievements"));
    document.getElementById("btn-exp-prefs").addEventListener("click", () => exportJsonBackup("preferences"));

    document.getElementById("import-backup-file").addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed.app !== "PROJECT_ASO" || !parsed.data) {
            alert("Invalid backup file format. Restoration aborted.");
            return;
          }
          if (!confirm("Warning: Restoring this backup will overwrite existing local records in that scope. Continue?")) {
            return;
          }
          if (parsed.scope === "all") {
            state = { ...structuredClone(DEFAULT_STATE), ...parsed.data };
          } else {
            Object.assign(state, parsed.data);
          }
          saveState();
          alert("Backup restored successfully!");
          renderOrganiserSection();
        } catch {
          alert("Corrupted JSON file. Unable to restore.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-download-questions-js").addEventListener("click", () => {
      const bank = getQuestionBank();
      const jsContent = `// PROJECT ASO — Verified 1915–1947+ Question Bank\nwindow.INITIAL_QUESTIONS = ${JSON.stringify(bank, null, 2)};\n`;
      downloadFile("questions.js", jsContent, "application/javascript");
    });
  }

  /* -------------------- INITIALIZE ALL EVENT LISTENERS -------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initWelcomeScreen();
    initExamCentre();
    initArenaControls();
    initResultControls();
    initLearningFilters();
    initProfileForm();
    initOrganiserControls();

    // Navigation & Global Quick Actions
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.nav));
    });
    document.querySelectorAll("[data-goto]").forEach(btn => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.goto));
    });
    document.getElementById("btn-mobile-menu").addEventListener("click", () => {
      document.getElementById("nav-drawer").classList.add("open");
      document.getElementById("nav-backdrop").classList.remove("hidden");
    });
    document.getElementById("btn-close-menu").addEventListener("click", closeMobileNav);
    document.getElementById("nav-backdrop").addEventListener("click", closeMobileNav);

    document.getElementById("btn-dash-start-mock").addEventListener("click", () => {
      selectedConfigMode = "full_mock";
      launchConfiguredMode();
    });
    document.getElementById("btn-refresh-quote").addEventListener("click", renderDashboard);
    document.getElementById("btn-quick-backup").addEventListener("click", () => exportJsonBackup("all"));
    document.getElementById("btn-banner-export").addEventListener("click", () => exportJsonBackup("all"));
    document.getElementById("btn-banner-dismiss").addEventListener("click", () => {
      document.getElementById("backup-reminder-bar").classList.add("hidden");
    });

    document.getElementById("btn-practice-weakest").addEventListener("click", () => {
      const { weakestUnit } = computeWeaknessAnalysis();
      startSession({
        mode: "unit_practice",
        modeLabel: `Unit ${weakestUnit} Targeted Revision`,
        isFullMock: false,
        unitFilter: weakestUnit,
        durationSeconds: 20 * 60,
        feedbackTiming: "immediate",
        shuffle: true
      });
    });
  });
})();
