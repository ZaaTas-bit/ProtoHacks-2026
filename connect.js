const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
let port = null;

function log(msg) {
  const lin
  e = document.createElement("div");
  line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function handleLine(line) {
  if (line === "START") {
    log("Game started");
  } else if (line === "WIN") {
    log("Game won! Unlocking...");
    const r = await chrome.runtime.sendMessage({ action: "SOLVE_PUZZLE" });
    log(r && r.success ? "Websites unlocked" : `Could not unlock: ${r ? r.error : "no response"}`);
  } else if (line === "LOSE") {
    log("Game lost. Websites stay locked.");
  } else {
    log(`Arduino: ${line}`);
  }
}

async function readLoop(p) {
  const decoder = new TextDecoderStream();
  const piped = p.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) await handleLine(line);
      }
    }
  } catch (e) {
    log(`Read error: ${e.message}`);
  } finally {
    try { reader.releaseLock(); } catch {}
    try { await piped; } catch {}
    try { await p.close(); } catch {}
    port = null;
    setStatus("Disconnected. Plug the Arduino in or press Connect.");
    log("Disconnected");
  }
}

async function openPort(p) {
  if (port) return;
  try {
    await p.open({ baudRate: 115200 });
  } catch (e) {
    setStatus("Could not open the port. Close the Arduino Serial Monitor and try again.");
    log(`Open failed: ${e.message}`);
    return;
  }
  port = p;
  setStatus("Connected. Keep this tab open and play the game!");
  log("Connected");
  readLoop(p);
}

document.getElementById("connect").addEventListener("click", async () => {
  try {
    const p = await navigator.serial.requestPort();
    await openPort(p);
  } catch (e) {
    log(`No port selected (${e.message})`);
  }
});

// Reconnect automatically to a previously approved Arduino.
navigator.serial.addEventListener("connect", e => openPort(e.target));
navigator.serial.getPorts().then(ports => {
  if (ports.length > 0) openPort(ports[0]);
});