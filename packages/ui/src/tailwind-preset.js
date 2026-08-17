/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--jaama-color-brand-primary, #002B9A)",
          "primary-hover": "var(--jaama-color-brand-primary-hover, #00227B)",
          navy: "var(--jaama-color-brand-navy, #0B1936)",
          "surface-light": "var(--jaama-color-brand-surface-light, #F0F4FF)",
          "border-light": "var(--jaama-color-brand-border-light, #C7D7FE)",
        },
        surface: {
          default: "var(--jaama-color-surface-default, #FFFFFF)",
          subtle: "var(--jaama-color-surface-subtle, #F8FAFC)",
          "brand-subtle": "var(--jaama-color-surface-brand-subtle, #F0F4FF)",
        },
        border: {
          default: "var(--jaama-color-border-default, #E2E8F0)",
          subtle: "var(--jaama-color-border-subtle, #F1F5F9)",
          "brand-subtle": "var(--jaama-color-border-brand-subtle, #C7D7FE)",
          focus: "var(--jaama-color-border-focus, #002B9A)",
        },
        content: {
          primary: "var(--jaama-color-text-primary, #0F172A)",
          secondary: "var(--jaama-color-text-secondary, #475569)",
          muted: "var(--jaama-color-text-muted, #94A3B8)",
          inverse: "var(--jaama-color-text-inverse, #FFFFFF)",
          brand: "var(--jaama-color-text-brand, #002B9A)",
        },
        status: {
          success: "#16A34A",
          "success-subtle": "#DCFCE7",
          "success-border": "#86EFAC",
          "success-text": "#15803D",
          warning: "#D97706",
          "warning-subtle": "#FEF3C7",
          "warning-border": "#FDE68A",
          "warning-text": "#B45309",
          danger: "#DC2626",
          "danger-subtle": "#FEE2E2",
          "danger-border": "#FCA5A5",
          "danger-text": "#B91C1C",
          info: "#2563EB",
          "info-subtle": "#EFF6FF",
          "info-border": "#BFDBFE",
          "info-text": "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        elevated: "0 10px 25px -5px rgba(0, 43, 154, 0.08), 0 8px 10px -6px rgba(0, 43, 154, 0.04)",
      },
    },
  },
};
