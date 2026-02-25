import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1b2a",
        canvas: "#f4f6f8",
        action: "#005ea5",
        success: "#1b7f3a",
        warning: "#a15c00",
        danger: "#b42318",
      },
    },
  },
  plugins: [],
};

export default config;


