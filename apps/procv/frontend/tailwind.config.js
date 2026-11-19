/** @type {import('tailwindcss').Config} */
import preset from "../../../packages/ui/tailwind-preset.js";

// Colors, typography, radii and shadows come from the shared ProSolutions
// preset (packages/ui/src/tokens.json). Do not redefine palettes here.
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../../packages/ui/src/**/*.{ts,tsx}"],
  plugins: []
};
