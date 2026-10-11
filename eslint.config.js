import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const noComments = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      comment:
        "Comments are not allowed: rename or extract until the code says it, or describe it in doc/.",
    },
  },
  create: (context) => ({
    Program: () =>
      context.sourceCode
        .getAllComments()
        .forEach((comment) => context.report({ loc: comment.loc, messageId: "comment" })),
  }),
};

const IMPERATIVE_SYNTAX = [
  { selector: "VariableDeclaration[kind='let']", message: "No let: declare a const." },
  { selector: "VariableDeclaration[kind='var']", message: "No var: declare a const." },
  { selector: "ForStatement", message: "No loops: use map, filter, flatMap or reduce." },
  { selector: "ForInStatement", message: "No loops: use map, filter, flatMap or reduce." },
  { selector: "ForOfStatement", message: "No loops: use map, filter, flatMap or reduce." },
  { selector: "WhileStatement", message: "No loops: use recursion or reduce." },
  { selector: "DoWhileStatement", message: "No loops: use recursion or reduce." },
  { selector: "SwitchStatement", message: "No switch: use a lookup table." },
  {
    selector: "ConditionalExpression > ConditionalExpression",
    message: "No nested ternaries: use a lookup table or a named function.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "data",
      "node_modules",
      "playwright-report",
      "test-results",
      "review-sample.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { style: { rules: { "no-comments": noComments } } },
    rules: {
      "style/no-comments": "error",
      "no-restricted-syntax": ["error", ...IMPERATIVE_SYNTAX],
      "no-param-reassign": ["error", { props: false }],
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["src/domain/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../server/*", "../client/*", "node:*", "express", "better-sqlite3"] },
          ],
        },
      ],
    },
  },
);
