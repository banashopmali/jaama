export const jaamaTokens = {
  colors: {
    brand: {
      primary: "#002B9A",
      primaryHover: "#00227B",
      navy: "#0B1936",
      surfaceLight: "#F0F4FF",
      borderLight: "#C7D7FE",
      canvas: "#F8FAFC",
    },
    surface: {
      default: "#FFFFFF",
      subtle: "#F8FAFC",
      brandSubtle: "#F0F4FF",
      hover: "#F1F5F9",
      disabled: "#E2E8F0",
    },
    border: {
      default: "#E2E8F0",
      subtle: "#F1F5F9",
      brandSubtle: "#C7D7FE",
      focus: "#002B9A",
      invalid: "#DC2626",
    },
    text: {
      primary: "#0F172A",
      secondary: "#475569",
      muted: "#94A3B8",
      inverse: "#FFFFFF",
      brand: "#002B9A",
      disabled: "#94A3B8",
    },
    status: {
      success: {
        default: "#16A34A",
        subtleBg: "#DCFCE7",
        subtleBorder: "#86EFAC",
        text: "#15803D",
      },
      warning: {
        default: "#D97706",
        subtleBg: "#FEF3C7",
        subtleBorder: "#FDE68A",
        text: "#B45309",
      },
      danger: {
        default: "#DC2626",
        subtleBg: "#FEE2E2",
        subtleBorder: "#FCA5A5",
        text: "#B91C1C",
      },
      info: {
        default: "#2563EB",
        subtleBg: "#EFF6FF",
        subtleBorder: "#BFDBFE",
        text: "#1D4ED8",
      },
      neutral: {
        default: "#64748B",
        subtleBg: "#F1F5F9",
        subtleBorder: "#E2E8F0",
        text: "#334155",
      },
    },
  },

  typography: {
    fontFamily: {
      sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "sans-serif"],
    },
    scale: {
      display: { fontSize: "2.25rem", lineHeight: "2.5rem", fontWeight: "800", letterSpacing: "-0.025em" },
      h1: { fontSize: "1.875rem", lineHeight: "2.25rem", fontWeight: "700", letterSpacing: "-0.02em" },
      h2: { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: "700", letterSpacing: "-0.015em" },
      h3: { fontSize: "1.25rem", lineHeight: "1.75rem", fontWeight: "600" },
      body: { fontSize: "1rem", lineHeight: "1.5rem", fontWeight: "400" },
      bodySmall: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: "400" },
      label: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: "600" },
      caption: { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: "500" },
    },
  },

  spacing: {
    0: "0px",
    1: "0.25rem",  // 4px
    2: "0.5rem",   // 8px
    3: "0.75rem",  // 12px
    4: "1rem",      // 16px
    5: "1.25rem",  // 20px
    6: "1.5rem",   // 24px
    8: "2rem",     // 32px
    10: "2.5rem",  // 40px
    12: "3rem",    // 48px
    16: "4rem",    // 64px
  },

  controlHeights: {
    sm: "2.5rem",   // 40px
    md: "2.75rem",  // 44px
    lg: "3rem",     // 48px
  },

  radii: {
    none: "0px",
    sm: "0.25rem",   // 4px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px
    full: "9999px",
  },

  shadows: {
    subtle: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
    card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
    elevated: "0 10px 25px -5px rgba(0, 43, 154, 0.08), 0 8px 10px -6px rgba(0, 43, 154, 0.04)",
  },
} as const;

export type JaamaTokens = typeof jaamaTokens;
