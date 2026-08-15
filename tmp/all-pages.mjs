import puppeteer from "puppeteer";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "D:/Work/Yedicihan New/tmp/shots-all";
fs.mkdirSync(OUT, { recursive: true });

const CAMP = "give-your-zakat-for-the-people-of-gaza";
const CAT = "sacrifices";
const POST = "2024-annual-report-al-afiya-foundation-achievements";
const POSTCAT = "69d2c651ff9da8fedfa5e734";

// Every public route. Dashboard is deliberately excluded.
const ROUTES = [
  ["01-home-ar", "/ar"],
  ["02-home-en", "/en"],
  ["03-campaigns", "/en/campaigns"],
  ["04-campaign", `/en/campaign/${CAMP}`],
  ["05-category", `/en/category/${CAT}`],
  ["06-blog", "/en/blog"],
  ["07-blogpost", `/en/blog/${POST}`],
  ["08-blogcat", `/en/blog/category/${POSTCAT}`],
  ["09-about", "/en/about-us"],
  ["10-contact", "/en/contact-us"],
  ["11-bank", "/en/bank-transfer"],
  ["12-terms", "/en/terms"],
  ["13-privacy", "/en/privacy"],
  ["14-signin", "/en/auth/signin"],
  ["15-autherror", "/en/auth/error"],
  ["16-autosignin", "/en/auth/auto-signin"],
  ["17-donationfailed", "/en/donation-failed"],
  ["18-success", "/en/success"],
  ["19-profile", "/en/profile"],
  ["20-home-tr", "/tr"],
];

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const bad = [];

for (const [name, path] of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  let status = "?";
  page.on("response", (r) => {
    if (r.url() === BASE + path) status = r.status();
  });
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 120000 });
  } catch {}
  await page.waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, { timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  const s = await page.evaluate(() => {
    const painted = new Set();
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      for (const v of [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderBottomColor]) painted.add(v);
    }
    const has = (rgb) => [...painted].some((c) => c.includes(rgb));
    return {
      burgundy: has("165, 36, 61"),   // #A5243D
      gold: has("216, 170, 85"),      // #D8AA55
      deep: has("2, 29, 50"),         // #021D32
      oldBlue: has("2, 94, 184"),     // #025EB8
      oldOrange: has("250, 93, 23"),  // #FA5D17
      pulses: document.querySelectorAll(".animate-pulse").length,
      text: document.body.innerText.length,
    };
  });

  await page.screenshot({ path: `${OUT}/${name}.png` });
  const flag = s.oldBlue || s.oldOrange ? "  <<< OLD BRAND COLOUR" : "";
  if (s.oldBlue || s.oldOrange) bad.push(name);
  console.log(
    `${name.padEnd(20)} http=${String(status).padEnd(4)} burgundy=${s.burgundy ? "Y" : "-"} gold=${s.gold ? "Y" : "-"} deep=${s.deep ? "Y" : "-"} ` +
      `oldBlue=${s.oldBlue ? "Y" : "-"} oldOrange=${s.oldOrange ? "Y" : "-"} text=${String(s.text).padEnd(6)}${flag}`
  );
  await page.close();
}

console.log(bad.length ? `\nPAGES WITH OLD BRAND COLOURS: ${bad.join(", ")}` : "\nNo page paints the old blue/orange.");
await browser.close();
