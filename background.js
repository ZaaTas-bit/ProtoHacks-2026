const UNLOCK_DURATION_MIN = 5;
const RELOCK_ALARM = "relock";

// Set to true while testing to show the "Simulate Puzzle Solved" button.
// Leave false so only the Arduino can unlock.
const DEV_MODE = false;

const ARDUINO_PAGE = chrome.runtime.getURL("connect.html");

async function getState() {
  const data = await chrome.storage.local.get(["lockedSites", "unlockedUntil"]);
  return {
    lockedSites: data.lockedSites || [],
    unlockedUntil: data.unlockedUntil || 0
  };
}

function isUnlocked(state) {
  return Date.now() < state.unlockedUntil;
}

// Make the real blocking rules match the stored state.
// Idempotent, so it is safe to call from anywhere.
async function syncRules() {
  const state = await getState();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);

  const addRules = isUnlocked(state)
    ? []
    : state.lockedSites.map((domain, i) => ({
        id: i + 1,
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ["main_frame"]
        }
      }));

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

function normalizeDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#:]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null;
}

// Adding a site locks it immediately (and ends any unlock window,
// so the new site is not left open).
async function addSite(input) {
  const domain = normalizeDomain(input);
  if (!domain) throw new Error("Enter a valid domain, like instagram.com");

  const state = await getState();
  if (state.lockedSites.includes(domain)) throw new Error(`${domain} is already locked`);

  await chrome.storage.local.set({
    lockedSites: [...state.lockedSites, domain],
    unlockedUntil: 0
  });
  await chrome.alarms.clear(RELOCK_ALARM);
  await syncRules();
}

// Removing a site is only allowed during an unlock window (after winning).
async function removeSite(input) {
  const state = await getState();
  if (!isUnlocked(state)) throw new Error("Win the game to remove a site");

  const domain = normalizeDomain(input);
  if (!domain || !state.lockedSites.includes(domain)) {
    throw new Error("That site is not in the list");
  }

  await chrome.storage.local.set({
    lockedSites: state.lockedSites.filter(s => s !== domain)
  });
  await syncRules();
}

// The only way to unlock: winning the game.
async function winGame() {
  const state = await getState();
  if (state.lockedSites.length === 0) throw new Error("No websites are locked yet");

  const unlockedUntil = Date.now() + UNLOCK_DURATION_MIN * 60 * 1000;
  await chrome.storage.local.set({ unlockedUntil });
  await chrome.alarms.create(RELOCK_ALARM, { when: unlockedUntil });
  await syncRules();
}

// Only the Arduino connection page (or anything, in DEV_MODE) may unlock.
function canUnlock(sender) {
  return DEV_MODE || (sender.url && sender.url.startsWith(ARDUINO_PAGE));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    switch (message.action) {
      case "GET_STATE": {
        const s = await getState();
        return { success: true, ...s, unlocked: isUnlocked(s), dev: DEV_MODE };
      }
      case "ADD_SITE":
        await addSite(message.domain);
        return { success: true };
      case "REMOVE_SITE":
        await removeSite(message.domain);
        return { success: true };
      case "SOLVE_PUZZLE":
        if (!canUnlock(sender)) {
          return { success: false, error: "Only the Arduino can unlock" };
        }
        await winGame();
        return { success: true };
      default:
        return { success: false, error: "Unknown action" };
    }
  };
  run().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
  return true; // keep channel open for async response
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === RELOCK_ALARM) {
    await chrome.storage.local.set({ unlockedUntil: 0 });
    await syncRules();
  }
});

chrome.runtime.onInstalled.addListener(syncRules);
chrome.runtime.onStartup.addListener(syncRules);