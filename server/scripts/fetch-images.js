/**
 * Downloads every photograph declared in client/src/lib/images.js into
 * client/public/images/, so the application can run from local assets rather
 * than a remote CDN.
 *
 * npm run fetch-images
 *
 * Afterwards, set VITE_IMAGE_SOURCE=local in client/.env to serve them.
 *
 * Any URL that fails is reported and skipped.
 */

const fs = require("fs");
const path = require("path");

const MANIFEST = path.join(
  __dirname,
  "..",
  "..",
  "client",
  "src",
  "lib",
  "images.js",
);

const OUT_ROOT = path.join(__dirname, "..", "..", "client", "public");

const WIDTH = 2000;

/**
 * Reads the declared photos from images.js.
 *
 * Supports both:
 *   id: "photo-123"
 *   local: "/images/example.jpg"
 *
 * and:
 *   id: 'photo-123'
 *   local: '/images/example.jpg'
 */
function readManifest() {
  const src = fs.readFileSync(MANIFEST, "utf8");

  const entries = [];

  const blockRe =
    /(\w+)\s*:\s*\{\s*id\s*:\s*["']([^"']+)["']\s*,\s*local\s*:\s*["']([^"']+)["']/g;

  let match;

  while ((match = blockRe.exec(src)) !== null) {
    entries.push({
      key: match[1],
      id: match[2],
      local: match[3],
    });
  }

  return entries;
}

async function download(entry) {
  const url =
    `https://images.unsplash.com/${entry.id}` +
    `?auto=format&fit=crop&w=${WIDTH}&q=78`;

  const target = path.join(OUT_ROOT, entry.local);

  fs.mkdirSync(path.dirname(target), {
    recursive: true,
  });

  const res = await fetch(url, {
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length < 4096) {
    throw new Error("response too small to be a photograph");
  }

  fs.writeFileSync(target, buffer);

  return buffer.length;
}

(async () => {
  const entries = readManifest();

  if (!entries.length) {
    console.error(
      "No photographs found in the manifest. Check client/src/lib/images.js",
    );
    process.exit(1);
  }

  console.log(
    `Fetching ${entries.length} photographs into client/public/images...\n`,
  );

  const failures = [];

  for (const entry of entries) {
    process.stdout.write(`  ${entry.key.padEnd(20)} `);

    try {
      const bytes = await download(entry);

      console.log(`ok   ${(bytes / 1024).toFixed(0)} KB  ->  ${entry.local}`);
    } catch (err) {
      console.log(`FAIL ${err.message}`);

      failures.push({
        ...entry,
        reason: err.message,
      });
    }
  }

  console.log("");

  if (failures.length) {
    console.log(
      `${failures.length} of ${entries.length} could not be fetched:`,
    );

    for (const failure of failures) {
      console.log(`  ${failure.key} (${failure.id}) - ${failure.reason}`);
    }

    console.log(
      "\nEdit client/src/lib/images.js to replace failed photographs.",
    );
  } else {
    console.log("All photographs downloaded.");
  }

  console.log(
    "\nSet VITE_IMAGE_SOURCE=local in client/.env to serve them locally.",
  );
})();
