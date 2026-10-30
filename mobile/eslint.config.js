import fs from "node:fs";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

const features = fs
  .readdirSync(new URL("./src/features", import.meta.url), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const noLegacyApi = {
  group: ["@/api", "@/api/**"],
  message:
    "src/api was removed. Server calls go in features/<name>/api.ts, shared code in @/lib.",
};
const noDeepFeatureImport = (self) => ({
  group: ["@/features/*/**", ...(self ? [`!@/features/${self}/**`] : [])],
  message:
    "Import another feature only through its entry point, @/features/<name>.",
});
const noUpwardImport = {
  group: ["@/app", "@/app/**", "@/features", "@/features/**"],
  message: "components/ and lib/ must not import features/ or app/.",
};
const noApp = {
  group: ["@/app", "@/app/**"],
  message: "features/ must not import app/.",
};
// Without ../ every cross-folder import goes through an @/ alias the rules above can see.
const noParentRelative = {
  group: ["../**"],
  message: "Use ./ inside the same folder and @/ aliases for anything else.",
};
const restrict = (...patterns) => ({
  "no-restricted-imports": [
    "error",
    { patterns: [noLegacyApi, noParentRelative, ...patterns] },
  ],
});

export default tseslint.config(
  { ignores: ["dist/**", "ios/**", "android/**", "src/lib/schema.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: restrict(noDeepFeatureImport()),
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: restrict(noUpwardImport),
  },
  ...features.map((name) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    rules: restrict(noDeepFeatureImport(name), noApp),
  })),
);
