// Checks public/portfolio.json against public/portfolio.schema.json.
// Runs before every build (npm "prebuild"), so a typo can't reach the
// live site. Usage: npm run validate-content
import { readFileSync } from "node:fs";
import Ajv from "ajv";

const read = (p) => readFileSync(new URL(`../public/${p}`, import.meta.url), "utf8");

let data;
try {
  data = JSON.parse(read("portfolio.json"));
} catch (err) {
  console.error(`✗ portfolio.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(JSON.parse(read("portfolio.schema.json")));

if (!validate(data)) {
  console.error("✗ portfolio.json doesn't match the schema:");
  for (const e of validate.errors) {
    const where = e.instancePath || "(top level)";
    const extra = e.params?.additionalProperty ? ` — "${e.params.additionalProperty}"` : "";
    console.error(`  • ${where}: ${e.message}${extra}`);
  }
  process.exit(1);
}

const todos = (JSON.stringify(data).match(/TODO/g) || []).length;
console.log(`✓ portfolio.json is valid${todos ? ` (${todos} TODO placeholder${todos > 1 ? "s" : ""} left to fill in)` : ""}`);
