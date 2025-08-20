// === CONFIG ===
const API_BASE = "https://irrigation-ai-backend.onrender.com"; // change this
const API_KEY = "N8pX3z!s9rQ#7yL2@hB5";                   // same as backend

function headers() {
  return { "Content-Type":"application/json", "X-API-Key": API_KEY };
}

const soilEl = document.getElementById("soil");
const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const pumpEl = document.getElementById("pump");
const statusEl = document.getElementById("api-status");

const thEl = document.getElementById("threshold");
const durEl = document.getElementById("duration");
const cdEl = document.getElementById("cooldown");
const qhEl = document.getElementById("quiet");

async function fetchStatus() {
  const r = await fetch(`${API_BASE}/api/status`, { headers: headers() });
  if (!r.ok) throw new Error("status failed");
  const data = await r.json();
  updateUI(data);
}

function updateUI(data) {
  statusEl.textContent = "connected";
  if (data.latest) {
    soilEl.textContent = (data.latest.soil ?? "--") + "%";
    tempEl.textContent = (data.latest.temp ?? "--") + "°C";
    humidityEl.textContent = (data.latest.humidity ?? "--") + "%";
  }
  pumpEl.textContent = data.pump || "--";
  thEl.value = data.config.thresholdSoil;
  durEl.value = data.config.waterDurationSec;
  cdEl.value = data.config.cooldownMin;
  qhEl.value = data.config.quietHours;
}

document.getElementById("btn-on").onclick = () =>
  fetch(`${API_BASE}/api/command/water`, { method:"POST", headers: headers(), body: JSON.stringify({ action:"ON" }) });

document.getElementById("btn-off").onclick = () =>
  fetch(`${API_BASE}/api/command/water`, { method:"POST", headers: headers(), body: JSON.stringify({ action:"OFF" }) });

document.getElementById("save-config").onclick = async () => {
  const payload = {
    thresholdSoil: Number(thEl.value),
    waterDurationSec: Number(durEl.value),
    cooldownMin: Number(cdEl.value),
    quietHours: qhEl.value
  };
  await fetch(`${API_BASE}/api/config`, { method:"PUT", headers: headers(), body: JSON.stringify(payload) });
};

// Live updates via SSE
(function connectSSE(){
  const es = new EventSource(`${API_BASE}/api/stream`);
  es.onopen = () => statusEl.textContent = "live";
  es.onmessage = () => {};
  es.addEventListener("telemetry", (e)=> updateUI({ latest: JSON.parse(e.data), pump: pumpEl.textContent, config: {
    thresholdSoil: Number(thEl.value),
    waterDurationSec: Number(durEl.value),
    cooldownMin: Number(cdEl.value),
    quietHours: qhEl.value
  }}));
  es.addEventListener("pump", (e)=> { const d = JSON.parse(e.data); pumpEl.textContent = d.pump; });
  es.addEventListener("config", (e)=> { const c = JSON.parse(e.data); updateUI({ latest: null, pump: pumpEl.textContent, config: c }); });
  es.onerror = () => { statusEl.textContent = "reconnecting…"; setTimeout(()=> es.close() || connectSSE(), 3000); };
})();

// Chatbot UI
const log = document.getElementById("chat-log");
const input = document.getElementById("chat-text");
document.getElementById("chat-send").onclick = sendChat;
input.addEventListener("keydown", e => { if (e.key==="Enter") sendChat(); });

function appendMsg(who, text) {
  const div = document.createElement("div");
  div.className = "msg " + (who === "user" ? "user" : "bot");
  const b = document.createElement("div");
  b.className = "bubble";
  b.textContent = text;
  div.appendChild(b);
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
async function sendChat() {
  const text = input.value.trim(); if (!text) return;
  input.value = "";
  appendMsg("user", text);
  const r = await fetch(`${API_BASE}/api/chat`, { method:"POST", headers: headers(), body: JSON.stringify({ message: text }) });
  const data = await r.json();
  appendMsg("bot", data.reply);
}

// boot
fetchStatus().catch(()=> statusEl.textContent = "offline");
