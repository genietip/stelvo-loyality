/**
 * Stelvo brand tokens — synced from artifacts/sparkly-web/src/index.css.
 * Primary: violet-purple hsl(262.1 83.3% 57.8%) ≈ #7c3aed.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#0a0a0a",
    tint: "#7c3aed",

    // Core surfaces
    background: "#ffffff",
    foreground: "#0f0e13",

    // Cards / elevated surfaces
    card: "#faf9fc",
    cardForeground: "#0f0e13",

    // Primary action color (buttons, links, active states)
    primary: "#7c3aed",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#f3f0fa",
    secondaryForeground: "#1c1826",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f4f2f8",
    mutedForeground: "#6f6a7c",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#ede9fb",
    accentForeground: "#4c1d95",

    // Destructive actions (delete, error states)
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#e8e5f0",
    input: "#e8e5f0",

    // Extras
    success: "#16a34a",
    warning: "#d97706",
  },

  dark: {
    text: "#f5f4f8",
    tint: "#a78bfa",

    background: "#0f0e13",
    foreground: "#f5f4f8",

    card: "#18161f",
    cardForeground: "#f5f4f8",

    primary: "#8b5cf6",
    primaryForeground: "#ffffff",

    secondary: "#221e2e",
    secondaryForeground: "#e7e3f2",

    muted: "#221e2e",
    mutedForeground: "#9b95ab",

    accent: "#2b2440",
    accentForeground: "#ddd3fb",

    destructive: "#f87171",
    destructiveForeground: "#ffffff",

    border: "#2a2735",
    input: "#2a2735",

    success: "#4ade80",
    warning: "#fbbf24",
  },

  // Border radius (px) — matches the web app's --radius: 0.5rem.
  radius: 12,
};

export default colors;
