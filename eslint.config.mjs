import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Toutes les variables d'env passent par lib/env (clientEnv / serverEnv),
  // qui valident leur présence. Interdit l'accès direct à process.env ailleurs.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            "Accède aux variables d'env via lib/env (clientEnv / serverEnv), pas directement via process.env.",
        },
      ],
    },
  },
  {
    files: ["lib/env/**"],
    rules: { "no-restricted-syntax": "off" },
  },
]);

export default eslintConfig;
