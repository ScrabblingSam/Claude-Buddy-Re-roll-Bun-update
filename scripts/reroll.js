#!/usr/bin/env node
// reroll.js — Brute-force search for a Claude Code buddy with target species + rarity
//
// Usage:  node reroll.js <species> [max_attempts]
//
// Examples:
//   node reroll.js cat              # Find the best cat (up to 500k attempts)
//   node reroll.js dragon 2000000   # Find the best dragon (up to 2M attempts)

const crypto = require("crypto");
const { hashString } = require("./wyhash.js");

// ─── Constants (extracted from Claude Code source) ───────────────────────────

const SALT = "friend-2026-401";

const SPECIES = [
  "duck",    "goose",    "blob",     "cat",
  "dragon",  "octopus",  "owl",      "penguin",
  "turtle",  "snail",    "ghost",    "axolotl",
  "capybara","cactus",   "robot",    "rabbit",
  "mushroom","chonk",
];

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const RARITY_RANK   = { common: 0,  uncommon: 1,  rare: 2,  epic: 3, legendary: 4 };

// ─── PRNG: Mulberry32 (same as Claude Code) ─────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Roll helpers ────────────────────────────────────────────────────────────

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) return r;
  }
  return "common";
}

// ─── Main ────────────────────────────────────────────────────────────────────

const target = process.argv[2] || "duck";
const max = parseInt(process.argv[3]) || 500000;

if (!SPECIES.includes(target)) {
  console.error(`Unknown species: ${target}`);
  console.error(`Valid: ${SPECIES.join(", ")}`);
  process.exit(1);
}

const runtime = typeof Bun !== "undefined" ? "bun" : "node";
console.log(`Searching for legendary ${target} (max: ${max.toLocaleString()}, runtime: ${runtime})...\n`);

let best = { rarity: "common", id: "" };

for (let i = 0; i < max; i++) {
  const id = crypto.randomBytes(32).toString("hex");
  const rng = mulberry32(hashString(id + SALT));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);

  if (species === target && RARITY_RANK[rarity] > RARITY_RANK[best.rarity]) {
    best = { rarity, id };
    console.log(`  found: ${rarity} ${species} -> ${id}`);
    if (rarity === "legendary") break;
  }
}

console.log(`\nBest: ${best.rarity} ${target} -> ${best.id}`);

if (best.rarity === "legendary") {
  console.log("\nTo apply, see README.md for instructions.");
}
