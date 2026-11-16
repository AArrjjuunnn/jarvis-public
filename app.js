const log = document.getElementById("log");
const form = document.getElementById("commandForm");
const input = document.getElementById("command");
const connection = document.getElementById("connection");

function addMessage(who, message, type = "") {
  const item = document.createElement("div");
  item.className = `msg ${type}`;
  const label = document.createElement("span");
  label.className = "who";
  label.textContent = who;
  const body = document.createElement("span");
  body.textContent = message;
  item.append(label, body);
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function speak(message) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1;
  utterance.pitch = 0.92;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

function reply(message, shouldSpeak = true) {
  addMessage("JARVIS", message);
  if (shouldSpeak) speak(message);
}

function getNotes() {
  try { return JSON.parse(localStorage.getItem("jarvis-notes") || "[]"); }
  catch { return []; }
}

function calculate(expression) {
  // Only allow basic arithmetic characters; never use eval().
  if (!/^[\d\s()+\-*/%.]+$/.test(expression)) return null;
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
  if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) return null;
  let pos = 0;
  function factor() {
    const token = tokens[pos++];
    if (token === "+") return factor();
    if (token === "-") return -factor();
    if (token === "(") {
      const value = expr();
      if (tokens[pos++] !== ")") throw Error("Bracket mismatch");
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw Error("Invalid number");
    return value;
  }
  function term() {
    let value = factor();
    while (tokens[pos] === "*" || tokens[pos] === "/" || tokens[pos] === "%") {
      const op = tokens[pos++];
      const rhs = factor();
      if ((op === "/" || op === "%") && rhs === 0) throw Error("Division by zero");
      value = op === "*" ? value * rhs : op === "/" ? value / rhs : value % rhs;
    }
    return value;
  }
  function expr() {
    let value = term();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  try {
    const result = expr();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    return Number(result.toPrecision(12));
  } catch { return null; }
}

function handleCommand(raw) {
  const command = raw.trim();
  if (!command) return;
  addMessage("YOU", command, "user");
  const lower = command.toLowerCase();

  if (/^(help|what can you do)\??$/.test(lower)) {
    reply("I can tell the time and date, calculate basic arithmetic, save and read notes, and open Google or YouTube searches. Voice input on this iPhone comes from the keyboard dictation button.");
  } else if (/\b(time|clock)\b/.test(lower)) {
    reply(`The time is ${new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}.`);
  } else if (/\b(date|day)\b/.test(lower)) {
    reply(`Today is ${new Date().toLocaleDateString([], {weekday:"long", year:"numeric", month:"long", day:"numeric"})}.`);
  } else if (lower.startsWith("calculate ") || lower.startsWith("what is ")) {
    const expression = command.replace(/^(calculate|what is)\s+/i, "").replace(/[?=]$/, "");
    const result = calculate(expression);
    reply(result === null ? "I couldn't parse that. Try something like: calculate (12 + 8) * 3." : `The answer is ${result}.`);
  } else if (lower.startsWith("note ") || lower.startsWith("remember ")) {
    const note = command.replace(/^(note|remember)\s+/i, "").trim();
    if (!note) reply("Give me the note after the word remember.");
    else {
      const notes = getNotes();
      notes.push({text: note, created: new Date().toISOString()});
      localStorage.setItem("jarvis-notes", JSON.stringify(notes));
      reply("Noted. It is stored on this device.");
    }
  } else if (lower.includes("read notes") || lower === "show notes") {
    const notes = getNotes();
    reply(notes.length ? `Your notes: ${notes.map((n, i) => `${i + 1}. ${n.text}`).join(". ")}` : "There are no saved notes.");
  } else if (lower === "clear notes") {
    localStorage.removeItem("jarvis-notes");
    reply("All locally saved notes have been cleared.");
  } else if (lower.startsWith("search ")) {
    const query = command.slice(7).trim();
    if (query) {
      reply(`Opening a web search for ${query}.`, false);
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener");
    } else reply("Tell me what to search for.");
  } else if (lower.startsWith("youtube ")) {
    const query = command.slice(8).trim();
    if (query) {
      reply(`Searching YouTube for ${query}.`, false);
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank", "noopener");
    } else reply("Tell me what to find on YouTube.");
  } else if (lower.includes("who are you")) {
    reply("I am JARVIS, a browser-based personal assistant prototype. Less billionaire genius, more useful web app.");
  } else if (lower.includes("hello") || lower.includes("hey jarvis")) {
    reply("Hello. All systems are operational.");
  } else if (lower.includes("fact")) {
    const facts = [
      "A day on Venus is longer than its year.",
      "The first computer bug was an actual insect found in a computer relay.",
      "A neutron star can spin hundreds of times every second.",
      "Octopuses have three hearts."
    ];
    reply(facts[Math.floor(Math.random() * facts.length)]);
  } else {
    reply("I don't have a matching command yet. Type Help to see what I can do, or use Search followed by your query.");
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  handleCommand(input.value);
  input.value = "";
  input.focus();
});

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => handleCommand(button.dataset.command));
});

function updateConnection() {
  connection.textContent = navigator.onLine ? "NETWORK AVAILABLE" : "OFFLINE MODE";
  connection.style.color = navigator.onLine ? "#8fffd0" : "#ffd18f";
}
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
updateConnection();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
