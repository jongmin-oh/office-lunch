import { ESLint } from "eslint";
import { expect, test } from "vitest";

const eslint = new ESLint();

async function restricted(file: string, source: string) {
  const [result] = await eslint.lintText(`import "${source}";\n`, {
    filePath: file,
  });
  return result.messages.some((m) => m.ruleId === "no-restricted-imports");
}

test.each([
  ["src/lib/x.ts", "@/features/auth"],
  ["src/components/x.tsx", "@/app/App"],
  ["src/features/account/x.ts", "@/features/auth/google"],
  ["src/features/account/x.ts", "@/app/App"],
  ["src/features/account/x.ts", "../auth/google"],
  ["src/app/x.tsx", "../features/auth/AuthProvider"],
  ["src/app/x.tsx", "@/features/auth/google"],
  ["src/app/x.tsx", "@/api/client"],
])("%s cannot import %s", async (file, source) => {
  expect(await restricted(file, source)).toBe(true);
});

test.each([
  ["src/features/account/x.ts", "@/features/auth"],
  ["src/features/account/x.ts", "./MyScreen"],
  ["src/features/account/x.ts", "@/features/account/MyScreen"],
  ["src/features/account/x.ts", "@/lib/token"],
  ["src/app/x.tsx", "@/features/auth"],
])("%s can import %s", async (file, source) => {
  expect(await restricted(file, source)).toBe(false);
});
