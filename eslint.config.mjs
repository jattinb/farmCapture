import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import("eslint").FlatConfig} */
const config = [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    ...pluginJs.configs.recommended,
  },
];

export default config;
