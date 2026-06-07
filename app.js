const STORAGE_KEY = "habit-harbor-state-v1";
const COACH_HISTORY_KEY = "habit-harbor-coach-history-v1";
const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
let installPrompt = null;

const dailyQuotes = [
  "Small promises kept daily become a life you can trust.",
  "Do the next right thing. Let momentum find you there.",
  "You do not need a perfect day. You need one honest action.",
  "Your future self is built by the quiet choices nobody sees.",
  "Energy follows motion. Start small and let the body remember.",
  "Consistency is not intensity. It is returning without drama.",
  "Better living starts with one repeatable act of care.",
  "A calm mind grows from tiny moments of attention.",
  "Make the healthy choice easier than the old pattern.",
  "Progress is allowed to be gentle and still be real.",
  "The goal is not to become someone else. It is to take better care of you.",
  "One completed habit is proof that the day can still turn toward you."
];

const seedHabits = [
  {
    id: crypto.randomUUID(),
    name: "Morning stretch",
    reminderTime: "08:00",
    graceMinutes: 30,
    notify: true,
    completions: {},
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    name: "Drink water",
    reminderTime: "13:00",
    graceMinutes: 60,
    notify: true,
    completions: {},
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    name: "Read for 10 minutes",
    reminderTime: "20:30",
    graceMinutes: 30,
    notify: true,
    completions: {},
    createdAt: new Date().toISOString()
  }
];

let state = loadState();
let coachHistory = loadCoachHistory();

const elements = {
  alertList: document.querySelector("#alertList"),
  bestStreak: document.querySelector("#bestStreak"),
  clearAlertsButton: document.querySelector("#clearAlertsButton"),
  coachEnergy: document.querySelector("#coachEnergy"),
  coachForm: document.querySelector("#coachForm"),
  coachChatForm: document.querySelector("#coachChatForm"),
  coachMessage: document.querySelector("#coachMessage"),
  coachMessages: document.querySelector("#coachMessages"),
  coachMode: document.querySelector("#coachMode"),
  coachMood: document.querySelector("#coachMood"),
  coachResponse: document.querySelector("#coachResponse"),
  coachSendButton: document.querySelector("#coachSendButton"),
  dailyQuote: document.querySelector("#dailyQuote"),
  doneCount: document.querySelector("#doneCount"),
  dueCount: document.querySelector("#dueCount"),
  emptyState: document.querySelector("#emptyState"),
  habitForm: document.querySelector("#habitForm"),
  habitGrace: document.querySelector("#habitGrace"),
  habitList: document.querySelector("#habitList"),
  habitName: document.querySelector("#habitName"),
  habitNotify: document.querySelector("#habitNotify"),
  habitTemplate: document.querySelector("#habitTemplate"),
  habitTime: document.querySelector("#habitTime"),
  installButton: document.querySelector("#installButton"),
  appStatus: document.querySelector("#appStatus"),
  notificationHelp: document.querySelector("#notificationHelp"),
  notifyButton: document.querySelector("#notifyButton"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  todayLabel: document.querySelector("#todayLabel")
};

function loadState() {
  const fallback = { habits: [], alerts: [], sent: {} };

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadCoachHistory() {
  try {
    return JSON.parse(localStorage.getItem(COACH_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCoachHistory() {
  localStorage.setItem(COACH_HISTORY_KEY, JSON.stringify(coachHistory.slice(-16)));
}

function formatDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function timeToDate(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(time) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(timeToDate(time));
}

function isDone(habit) {
  return Boolean(habit.completions[todayKey()]);
}

function minutesUntilHabit(habit) {
  return Math.round((timeToDate(habit.reminderTime) - new Date()) / 60000);
}

function getHabitStatus(habit) {
  if (isDone(habit)) return "done";

  const until = minutesUntilHabit(habit);
  if (until > 0) return "upcoming";
  if (Math.abs(until) >= Number(habit.graceMinutes)) return "overdue";
  return "due";
}

function statusText(habit) {
  const status = getHabitStatus(habit);
  const time = formatTime(habit.reminderTime);

  if (status === "done") return `Done today - reminder was ${time}`;
  if (status === "upcoming") return `Reminder at ${time}`;
  if (status === "overdue") return `Overdue - reminder was ${time}`;
  return `Due now - reminder at ${time}`;
}

function currentStreak(habit) {
  let streak = 0;
  const cursor = new Date();

  while (habit.completions[dateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addAlert(title, body, habitId) {
  state.alerts.unshift({
    id: crypto.randomUUID(),
    habitId,
    title,
    body,
    createdAt: new Date().toISOString()
  });
  state.alerts = state.alerts.slice(0, 12);
  saveState();
}

async function sendBrowserNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const options = {
    body,
    icon: "icons/icon.svg",
    badge: "icons/icon.svg",
    tag: `habit-harbor-${title}`,
    requireInteraction: false
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  } catch {
    elements.appStatus.textContent =
      "Notification could not be shown, but the reminder was saved here.";
  }
}

function notifyHabit(habit, type) {
  const title = type === "overdue" ? "Habit overdue" : "Habit reminder";
  const body =
    type === "overdue"
      ? `${habit.name} is still unchecked.`
      : `It is time for ${habit.name}.`;

  addAlert(title, body, habit.id);
  sendBrowserNotification(title, body);
}

function notificationKey(habit, type) {
  return `${todayKey()}-${habit.id}-${type}`;
}

function checkReminders() {
  state.habits.forEach((habit) => {
    if (!habit.notify || isDone(habit)) return;

    const until = minutesUntilHabit(habit);
    const reminderKey = notificationKey(habit, "reminder");
    const overdueKey = notificationKey(habit, "overdue");

    if (until <= 0 && !state.sent[reminderKey]) {
      state.sent[reminderKey] = true;
      notifyHabit(habit, "reminder");
    }

    if (until <= -Number(habit.graceMinutes) && !state.sent[overdueKey]) {
      state.sent[overdueKey] = true;
      notifyHabit(habit, "overdue");
    }
  });

  saveState();
  render();
}

function renderHabits() {
  elements.habitList.innerHTML = "";

  const sortedHabits = [...state.habits].sort((a, b) =>
    a.reminderTime.localeCompare(b.reminderTime)
  );

  sortedHabits.forEach((habit) => {
    const node = elements.habitTemplate.content.firstElementChild.cloneNode(true);
    const status = getHabitStatus(habit);

    node.classList.toggle("done", status === "done");
    node.classList.toggle("overdue", status === "overdue");
    node.querySelector("h3").textContent = habit.name;
    node.querySelector(".habit-meta").textContent = statusText(habit);
    node.querySelector(".streak-pill").textContent =
      `${currentStreak(habit)} day streak`;

    const checkButton = node.querySelector(".check-button");
    checkButton.setAttribute(
      "aria-label",
      isDone(habit) ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`
    );
    checkButton.addEventListener("click", () => toggleHabit(habit.id));

    node.querySelector(".delete-button").addEventListener("click", () => {
      deleteHabit(habit.id);
    });

    elements.habitList.appendChild(node);
  });

  elements.emptyState.classList.toggle("visible", state.habits.length === 0);
}

function renderStats() {
  const total = state.habits.length;
  const done = state.habits.filter(isDone).length;
  const due = total - done;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const best = state.habits.reduce(
    (max, habit) => Math.max(max, currentStreak(habit)),
    0
  );

  elements.doneCount.textContent = done;
  elements.dueCount.textContent = due;
  elements.bestStreak.textContent = best;
  elements.progressText.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.setAttribute("aria-valuenow", String(percent));
}

function renderDailyQuote() {
  const date = new Date();
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  elements.dailyQuote.textContent = dailyQuotes[dayNumber % dailyQuotes.length];
}

function getCompletionSnapshot() {
  const total = state.habits.length;
  const done = state.habits.filter(isDone).length;
  const overdue = state.habits.filter((habit) => getHabitStatus(habit) === "overdue").length;
  const upcoming = state.habits.filter((habit) => getHabitStatus(habit) === "upcoming").length;
  return { total, done, overdue, upcoming };
}

function getHabitSummary() {
  return state.habits.map((habit) => ({
    name: habit.name,
    reminderTime: habit.reminderTime,
    status: getHabitStatus(habit),
    streak: currentStreak(habit)
  }));
}

function getCoachAdvice({ mood, energy, goal }) {
  const snapshot = getCompletionSnapshot();
  const completionRate = snapshot.total ? Math.round((snapshot.done / snapshot.total) * 100) : 0;
  const goalText = goal.trim();
  const cards = [];

  if (snapshot.total === 0) {
    cards.push({
      title: "Start smaller than your ambition",
      body: "Add one habit that takes under two minutes. A tiny reliable habit beats a perfect plan that never starts."
    });
  } else if (completionRate === 100) {
    cards.push({
      title: "Protect the streak",
      body: "You are complete today. Keep tomorrow easy by preparing the first step now, like placing water, shoes, or a notebook where you will see it."
    });
  } else if (snapshot.overdue > 0) {
    cards.push({
      title: "Rescue the day",
      body: `You have ${snapshot.overdue} overdue habit${snapshot.overdue === 1 ? "" : "s"}. Pick the fastest one and do a lighter version right now.`
    });
  } else {
    cards.push({
      title: "Use your next reminder",
      body: `${completionRate}% is done today. Keep the bar low enough that showing up feels possible, then let the streak do the heavy lifting.`
    });
  }

  if (mood === "stressed") {
    cards.push({
      title: "Calm first, optimize second",
      body: "Take 60 seconds for slow breathing before chasing productivity. A regulated nervous system makes better choices."
    });
  } else if (mood === "tired" || Number(energy) <= 2) {
    cards.push({
      title: "Choose recovery effort",
      body: "Make today's habits gentler: shorter movement, earlier sleep, water, sunlight, and one small win. Low energy still deserves care."
    });
  } else if (mood === "low") {
    cards.push({
      title: "Aim for contact with life",
      body: "Do one grounding action: shower, step outside, text someone safe, or clean one surface. If this feeling gets heavy or unsafe, reach out to a professional or emergency support."
    });
  } else if (mood === "motivated") {
    cards.push({
      title: "Spend motivation wisely",
      body: "Use the extra drive to make tomorrow easier, not harder. Prep your environment instead of adding five new habits at once."
    });
  } else {
    cards.push({
      title: "Steady is powerful",
      body: "A steady day is perfect for repetition. Keep your promise boring, repeatable, and easy to restart."
    });
  }

  if (goalText) {
    cards.push({
      title: "Your focus",
      body: `For "${goalText}", choose one action you can finish in 10 minutes today. The coach move is clarity plus repetition.`
    });
  }

  return cards;
}

function renderCoachResponse(cards = getCoachAdvice({ mood: "steady", energy: 3, goal: "" })) {
  elements.coachResponse.innerHTML = "";
  cards.forEach((card) => {
    const node = document.createElement("div");
    node.className = "coach-card";
    node.innerHTML = `<strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.body)}</p>`;
    elements.coachResponse.appendChild(node);
  });
}

function appendCoachMessage(role, text) {
  coachHistory.push({
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString()
  });
  coachHistory = coachHistory.slice(-16);
  saveCoachHistory();
  renderCoachMessages();
}

function renderCoachMessages() {
  elements.coachMessages.innerHTML = "";

  if (coachHistory.length === 0) {
    elements.coachMessages.innerHTML =
      '<p class="muted">Ask your coach for help with a habit, your energy, sleep, stress, or a small next step.</p>';
    return;
  }

  coachHistory.forEach((message) => {
    const item = document.createElement("div");
    item.className = `coach-message ${message.role}`;
    item.innerHTML = `<strong>${message.role === "user" ? "You" : "Coach"}</strong><p>${escapeHtml(message.text)}</p>`;
    elements.coachMessages.appendChild(item);
  });

  elements.coachMessages.scrollTop = elements.coachMessages.scrollHeight;
}

async function requestOnlineCoach(message) {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      mood: elements.coachMood.value,
      energy: elements.coachEnergy.value,
      habits: getHabitSummary(),
      progress: getCompletionSnapshot()
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Online coach is not available yet.");
  }

  return data.reply;
}

function getFallbackCoachReply(message) {
  const advice = getCoachAdvice({
    mood: elements.coachMood.value,
    energy: elements.coachEnergy.value,
    goal: message
  });
  return advice.map((card) => `${card.title}: ${card.body}`).join("\n\n");
}

async function handleCoachChat(message) {
  appendCoachMessage("user", message);
  elements.coachSendButton.disabled = true;
  elements.coachSendButton.textContent = "Thinking...";
  elements.coachMode.textContent = "Connecting to online coach...";

  try {
    const reply = await requestOnlineCoach(message);
    appendCoachMessage("coach", reply);
    elements.coachMode.textContent = "Online AI coach active";
  } catch {
    appendCoachMessage("coach", getFallbackCoachReply(message));
    elements.coachMode.textContent =
      "Using local coach fallback until the online AI backend is deployed.";
  } finally {
    elements.coachSendButton.disabled = false;
    elements.coachSendButton.textContent = "Send to coach";
  }
}

function renderAlerts() {
  elements.alertList.innerHTML = "";

  if (state.alerts.length === 0) {
    elements.alertList.innerHTML =
      '<p class="muted">No reminders yet. Alerts appear here when a habit is due.</p>';
    return;
  }

  state.alerts.forEach((alert) => {
    const item = document.createElement("div");
    item.className = "alert-item";
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(alert.createdAt));
    item.innerHTML = `<strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(
      alert.body
    )} - ${time}</span>`;
    elements.alertList.appendChild(item);
  });
}

function renderNotificationHelp() {
  if (!("Notification" in window)) {
    elements.notificationHelp.textContent =
      "This browser does not support notifications, but in-app alerts still work.";
    elements.notifyButton.disabled = true;
    return;
  }

  const permission = Notification.permission;
  elements.notifyButton.textContent =
    permission === "granted" ? "Notifications enabled" : "Enable notifications";
  elements.notifyButton.disabled = permission === "granted";
  elements.notificationHelp.textContent =
    permission === "granted"
      ? "Keep the app open or recently active for reminder and overdue notifications."
      : "Allow notifications to receive reminders while this app is open or recently active.";
}

function renderInstallButton() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;

  elements.installButton.hidden = standalone || !installPrompt;
}

function updateAppStatus() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  const networkText = navigator.onLine ? "Ready offline" : "Offline mode";
  const installText = standalone ? "Installed" : "Mobile ready";

  elements.appStatus.textContent = `${installText} - ${networkText}`;
}

function render() {
  renderDailyQuote();
  elements.todayLabel.textContent = formatDate();
  renderHabits();
  renderStats();
  renderAlerts();
  renderNotificationHelp();
  renderInstallButton();
  updateAppStatus();
  if (!elements.coachResponse.children.length) {
    renderCoachResponse();
  }
  renderCoachMessages();
}

function toggleHabit(id) {
  const habit = state.habits.find((item) => item.id === id);
  if (!habit) return;

  const today = todayKey();
  if (habit.completions[today]) {
    delete habit.completions[today];
  } else {
    habit.completions[today] = new Date().toISOString();
  }

  saveState();
  render();
}

function deleteHabit(id) {
  state.habits = state.habits.filter((habit) => habit.id !== id);
  saveState();
  render();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

elements.habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.habitName.value.trim();
  if (!name) return;

  state.habits.push({
    id: crypto.randomUUID(),
    name,
    reminderTime: elements.habitTime.value,
    graceMinutes: Number(elements.habitGrace.value),
    notify: elements.habitNotify.checked,
    completions: {},
    createdAt: new Date().toISOString()
  });

  elements.habitForm.reset();
  elements.habitGrace.value = "30";
  elements.habitNotify.checked = true;
  saveState();
  render();
});

elements.notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  await Notification.requestPermission();
  renderNotificationHelp();
});

elements.coachForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const cards = getCoachAdvice({
    mood: elements.coachMood.value,
    energy: elements.coachEnergy.value,
    goal: ""
  });
  renderCoachResponse(cards);
});

elements.coachChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = elements.coachMessage.value.trim();
  if (!message) return;
  elements.coachMessage.value = "";
  await handleCoachChat(message);
});

elements.installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  renderInstallButton();
});

elements.clearAlertsButton.addEventListener("click", () => {
  state.alerts = [];
  saveState();
  render();
});

elements.resetDemoButton.addEventListener("click", () => {
  state = {
    habits: structuredClone(seedHabits),
    alerts: [],
    sent: {}
  };
  saveState();
  render();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  renderInstallButton();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  renderInstallButton();
});

window.addEventListener("online", updateAppStatus);
window.addEventListener("offline", updateAppStatus);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(updateAppStatus)
      .catch(() => {
        elements.appStatus.textContent =
          "Offline install support could not be enabled in this browser.";
      });
  });
}

render();
checkReminders();
setInterval(checkReminders, 60 * 1000);
