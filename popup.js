const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const solveBtn = document.getElementById("solve");

async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  return result || { success: false, error: "No response from background" };
}

async function refresh() {
  const s = await send({ action: "GET_STATE" });
  if (!s.success) { statusEl.textContent = s.error; return; }

  solveBtn.hidden = !s.dev;

  listEl.innerHTML = "";
  for (const site of s.lockedSites) {
    const li = document.createElement("li");
    li.textContent = site + " ";

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.disabled = !s.unlocked;
    btn.title = s.unlocked ? "" : "Win the game to remove sites";
    btn.addEventListener("click", async () => {
      const result = await send({ action: "REMOVE_SITE", domain: site });
      await refresh();
      if (!result.success) statusEl.textContent = result.error;
    });

    li.appendChild(btn);
    listEl.appendChild(li);
  }

  if (s.lockedSites.length === 0) {
    statusEl.textContent = "No websites locked yet.";
  } else if (s.unlocked) {
    const mins = Math.ceil((s.unlockedUntil - Date.now()) / 60000);
    statusEl.textContent = `Unlocked (~${mins} min left)`;
  } else {
    statusEl.textContent = "Locked. Win the game to unlock.";
  }
}

document.getElementById("add").addEventListener("click", async () => {
  const input = document.getElementById("site");
  const result = await send({ action: "ADD_SITE", domain: input.value });
  if (result.success) input.value = "";
  await refresh();
  if (!result.success) statusEl.textContent = result.error;
});

document.getElementById("connect").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("connect.html") });
});

solveBtn.addEventListener("click", async () => {
  const result = await send({ action: "SOLVE_PUZZLE" });
  await refresh();
  if (!result.success) statusEl.textContent = result.error;
});

refresh();