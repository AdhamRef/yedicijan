import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** Generated output and scratch folders: not application code, must not be able to fail the lint gate. */
const ignores = [
  ".next/**",
  ".integration-test-build/**",
  "node_modules/**",
  "generated/**",
  "tmp/**",
  "public/**",
  "Work/**",
  "main/**",
  // Unreferenced, uncompilable leftovers (same as Minber's config).
  "**/blog/_components/_components/**",
  "**/blog/_components/wysiwyg/BlogEditorAR.jsx",
];

const eslintConfig = [
  { ignores },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
