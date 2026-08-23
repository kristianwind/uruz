/**
 * Capture the screenshots used in README.md and on the website.
 *
 *   npm run gen:screenshots
 *
 * It runs the app against a *throwaway* database seeded with demo users and
 * twelve weeks of history, on its own port and its own build directory, so it
 * never touches your real data or a dev server you have running.
 *
 * It drives the copy of Chrome already installed on the machine rather than
 * downloading one — `puppeteer-core` is the remote control, not the browser.
 * Set CHROME_PATH if yours lives somewhere unusual.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer-core";

const PORT = Number(process.env.URUZ_SHOT_PORT || 3200);
const BASE = `http://localhost:${PORT}`;
// One set per language: the Danish site should not show English screens, and
// the README — public, English-facing — should not show Danish ones.
const LOCALE = (process.env.URUZ_SHOT_LOCALE || "en").toLowerCase();
const OUT = join(process.cwd(), "docs", "screenshots", LOCALE);
const DB = join(tmpdir(), "uruz-screenshots", "uruz.sqlite");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => !!p);

/** An iPhone 15, as far as the page can tell. */
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const SHOTS: Array<{ name: string; path: string }> = [
  { name: "train", path: "/train" },
  // Filled in once the demo session exists — this is the screen the app is
  // actually for, so it is worth the extra setup.
  { name: "session", path: "" },
  { name: "stats", path: "/stats" },
  { name: "valhal", path: "/valhal" },
  { name: "coach", path: "/coach" },
  { name: "library", path: "/library/exercises" },
  { name: "me", path: "/me" },
];

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error("No Chrome found. Install Chrome, or set CHROME_PATH.");
    process.exit(1);
  }
  return found;
}

function seedDatabase(): void {
  rmSync(join(tmpdir(), "uruz-screenshots"), { recursive: true, force: true });
  mkdirSync(join(tmpdir(), "uruz-screenshots"), { recursive: true });
  const env = { ...process.env, URUZ_SQLITE_PATH: DB };

  console.log("· Seeding a throwaway database …");
  run("npx", ["tsx", "scripts/seed.ts"], { ...env, URUZ_SEED_DEMO: "true" });
  // A second member makes the leaderboard a leaderboard rather than a list of
  // one, which is the whole point of the Valhalla screenshot.
  run("npx", [
    "tsx",
    "-e",
    `import { getAnyHall } from "./src/lib/db/repo/halls";
     import { createUser, getUserByEmail } from "./src/lib/db/repo/users";
     const hall = getAnyHall()!;
     if (!getUserByEmail("ib@uruz.local"))
       createUser({ hallId: hall.id, email: "ib@uruz.local", displayName: "Ib" });`,
  ], env);
  run("npx", ["tsx", "scripts/seed-history.ts"], env);
}

/**
 * Put the demo account mid-workout, and give Kvasir something to have said.
 *
 * An empty coach screen and an empty session screen are accurate pictures of a
 * brand-new install and useless pictures of the app. Returns the id of the
 * session left open, so it can be navigated to.
 */
function stageLiveScreens(): string {
  const env = { ...process.env, URUZ_SQLITE_PATH: DB };
  const res = spawnSync(
    "npx",
    [
      "tsx",
      "-e",
      `import { getAnyHall } from "./src/lib/db/repo/halls";
       import { getUserByEmail, updateUser } from "./src/lib/db/repo/users";
       import { listTemplates, getWorkoutExercises } from "./src/lib/db/repo/workouts";
       import { startSession, logSet } from "./src/lib/db/repo/sessions";
       import { addCoachMessage } from "./src/lib/db/repo/coach";

       const hall = getAnyHall()!;
       const user = getUserByEmail("kristian@uruz.local")!;
       // The screenshots are of the app in one language, so the demo account
       // has to be in it — the UI follows the signed-in user's preference.
       updateUser(user.id, { localePref: process.env.URUZ_SHOT_LOCALE || "en" });

       const template = listTemplates(hall.id).find((t) => t.name.startsWith("Helkrop"))!;
       const items = getWorkoutExercises(template.id);
       const session = startSession(user.id, template.id);
       // Two sets in: enough that the screen shows real numbers and a next
       // target, not so many that the exercise looks finished.
       logSet(user.id, { sessionId: session.id, exerciseId: items[0].exerciseId, setIndex: 0, weight: 60, reps: 8 });
       logSet(user.id, { sessionId: session.id, exerciseId: items[0].exerciseId, setIndex: 1, weight: 60, reps: 8 });

       addCoachMessage({
         userId: user.id,
         kind: "opsummering",
         body: (process.env.URUZ_SHOT_LOCALE || "en") === "da"
           ? "Du har trænet to gange om ugen i tolv uger — det er stabiliteten, ikke de enkelte løft, der har flyttet dit benpres fra 47,5 til 55 kg. Ryggen halter lidt bagefter brystet; læg en ekstra trækøvelse ind i Helkrop B, så holder du balancen."
           : "You have trained twice a week for twelve weeks — it is the consistency, not any single lift, that moved your leg press from 47.5 to 55 kg. Your back lags a little behind your chest; add one more pulling exercise to Full body B and you keep the balance.",
       });

       process.stdout.write(session.id);`,
    ],
    { env, encoding: "utf8" },
  );
  if (res.status !== 0) {
    console.error(res.stderr);
    process.exit(1);
  }
  return res.stdout.trim().split("\n").pop()!.trim();
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): void {
  const res = spawnSync(cmd, args, { env, stdio: "inherit" });
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(" ")}`);
    process.exit(1);
  }
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/train`);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("The app did not start in time.");
}

async function main(): Promise<void> {
  const chrome = findChrome();
  seedDatabase();
  const sessionId = stageLiveScreens();
  const shots = SHOTS.map((s) =>
    s.name === "session" ? { ...s, path: `/train/session/${sessionId}` } : s,
  );
  mkdirSync(OUT, { recursive: true });

  console.log(`· Starting the app on ${BASE} …`);
  const server: ChildProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    env: {
      ...process.env,
      URUZ_SQLITE_PATH: DB,
      // Its own build directory, so a dev server you have running is untouched.
      NEXT_DIST_DIR: ".next-shots",
      // Sign in as the demo admin without a passkey or a mail server.
      URUZ_DEV_AUTOLOGIN: "true",
    },
    stdio: "ignore",
  });

  try {
    await waitForServer();
    const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    // The dev server's own toolbar floats over the bottom-left tab. It is not
    // part of the app, so it has no business being in a picture of the app.
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.append(style));
    });

    for (const shot of shots) {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle0" });
      // Charts animate in; a still frame of a half-drawn line is not a
      // screenshot of the app, it is a screenshot of a loading state.
      await new Promise((r) => setTimeout(r, 1200));
      const file = join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file as `${string}.png` });
      console.log(`  ✓ ${shot.name}.png`);
    }

    await browser.close();
    console.log(`\n✔ Screenshots written to docs/screenshots/${LOCALE}/`);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
