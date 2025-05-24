import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        rules: {
            'prettier/prettier': 'warn',
            // Add your custom rules here, for example:
            'no-unused-vars': 'warn',
            'no-undef': 'warn',
        },
    },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: globals.browser } },
]);
