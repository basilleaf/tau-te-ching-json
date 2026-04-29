import { writeFileSync } from "fs";

const URL = "https://www.gutenberg.org/cache/epub/216/pg216.txt";

const res = await fetch(URL);
const raw = await res.text();

const start = raw.indexOf("*** START OF THE PROJECT GUTENBERG");
const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG");
const body = raw.slice(start, end).replace(/\r\n/g, "\n");

// Find every chapter boundary: 2+ blank lines then the chapter number (1-81)
// Chapter 1 uses "Ch. 1." prefix; the rest use just "N."
const chapterStarts = [];

// Chapter 1
const ch1Match = body.match(/Ch\.\s+1\./);
if (ch1Match) chapterStarts.push({ verse: 1, index: ch1Match.index });

// Chapters 2–81: look for \n\n+N. where N is 2-81
for (let n = 2; n <= 81; n++) {
  const re = new RegExp(`\n{2,}${n}\\.(?:\\s|\\n)`);
  const m = re.exec(body);
  if (m) {
    // Point to where the number starts (after the newlines)
    const numStart = m.index + m[0].search(new RegExp(`${n}\\.`));
    chapterStarts.push({ verse: n, index: numStart });
  }
}

chapterStarts.sort((a, b) => a.index - b.index);

// Extract text between chapter boundaries
const cleanText = (raw) =>
  raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Remove subsection numbers: lines that are just "1." or start text with "1. "
    .map((l) => l.replace(/^\d+\.\s+/, ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

const chapters = chapterStarts.map(({ verse, index }, i) => {
  const nextIndex = chapterStarts[i + 1]?.index ?? body.length;
  const chapterBody = body.slice(index, nextIndex);

  // Strip the chapter header line ("Ch. 1." or "N.")
  const withoutHeader = chapterBody.replace(/^(?:Ch\.\s+)?\d+\.\s*/, "");

  return { verse, text: cleanText(withoutHeader) };
});

const outPath = process.argv[2] ?? "tao.json";
writeFileSync(outPath, JSON.stringify(chapters, null, 2));
console.log(`Wrote ${chapters.length} chapters to ${outPath}`);

const missing = [];
const found = new Set(chapters.map((c) => c.verse));
for (let i = 1; i <= 81; i++) if (!found.has(i)) missing.push(i);
if (missing.length) console.log("Missing chapters:", missing.join(", "));
else console.log("All 81 chapters present.");

console.log("\nSample ch.1:", chapters[0]?.text.slice(0, 100));
console.log("Sample ch.11:", chapters.find((c) => c.verse === 11)?.text.slice(0, 100));
console.log("Sample ch.21:", chapters.find((c) => c.verse === 21)?.text.slice(0, 100));
console.log("Sample ch.81:", chapters.find((c) => c.verse === 81)?.text.slice(0, 100));
