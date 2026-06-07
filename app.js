const STORAGE_KEY = "habit-harbor-state-v1";
const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
let installPrompt = null;

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

const elements = {
  alertList: document.querySelector("#alertList"),
  bestStreak: document.querySelector("#bestStreak"),
  clearAlertsButton: document.querySelector("#clearAlertsButton"),
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
  elements.todayLabel.textContent = formatDate();
  renderHabits();
  renderStats();
  renderAlerts();
  renderNotificationHelp();
  renderInstallButton();
  updateAppStatus();
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
