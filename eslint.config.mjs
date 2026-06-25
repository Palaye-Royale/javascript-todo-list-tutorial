import js from "@eslint/js";
import globals from "globals";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
  // Папка backend/ и файлы public/lib/elmish.js, public/lib/todo-app.js исключены, т.к. используют 
  // глобальные переменные и конструкции (require, module.exports), которые недоступны в браузере, 
  // но необходимы для работы приложения. Игнорирование позволяет избежать ложных срабатываний линтера.
  { ignores: ["backend/**", "public/lib/elmish.js", "public/lib/todo-app.js"] }
]);
