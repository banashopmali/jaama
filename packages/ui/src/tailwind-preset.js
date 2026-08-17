/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--jaama-color-brand-primary, #002B9A)",
          "primary-hover": "var(--jaama-color-brand-primary-hover, #00227B)",
          "primary-active": "var(--jaama-color-brand-primary-active, #001A61)",
          navy: "var(--jaama-color-brand-navy, #0B1936)",
          "surface-light": "var(--jaama-color-brand-surface-light, #F0F4FF)",
          "border-light": "var(--jaama-color-brand-border-light, #C7D7FE)",
        },
        surface: {
          default: "var(--jaama-color-surface-default, #FFFFFF)",
          subtle: "var(--jaama-color-surface-subtle, #F8FAFC)",
          "brand-subtle": "var(--jaama-color-surface-brand-subtle, #F0F4FF)",
          "brand-subtle-hover": "var(--jaama-color-surface-brand-subtle-hover, #E0E9FF)",
          "brand-subtle-active": "var(--jaama-color-surface-brand-subtle-active, #C7D7FE)",
          hover: "var(--jaama-color-surface-hover, #F1F5F9)",
          disabled: "var(--jaama-color-surface-disabled, #E2E8F0)",
        },
        border: {
          default: "var(--jaama-color-border-default, #E2E8F0)",
          subtle: "var(--jaama-color-border-subtle, #F1F5F9)",
          "brand-subtle": "var(--jaama-color-border-brand-subtle, #C7D7FE)",
          focus: "var(--jaama-color-border-focus, #002B9A)",
          invalid: "var(--jaama-color-border-invalid, #DC2626)",
        },
        content: {
          primary: "var(--jaama-color-text-primary, #0F172A)",
          secondary: "var(--jaama-color-text-secondary, #475569)",
          muted: "var(--jaama-color-text-muted, #94A3B8)",
          inverse: "var(--jaama-color-text-inverse, #FFFFFF)",
          brand: "var(--jaama-color-text-brand, #002B9A)",
          disabled: "var(--jaama-color-text-disabled, #94A3B8)",
        },
        status: {
          success: "var(--jaama-color-status-success, #16A34A)",
          "success-subtle": "var(--jaama-color-status-success-subtle, #DCFCE7)",
          "success-border": "var(--jaama-color-status-success-border, #86EFAC)",
          "success-text": "var(--jaama-color-status-success-text, #15803D)",

          warning: "var(--jaama-color-status-warning, #D97706)",
          "warning-subtle": "var(--jaama-color-status-warning-subtle, #FEF3C7)",
          "warning-border": "var(--jaama-color-status-warning-border, #FDE68A)",
          "warning-text": "var(--jaama-color-status-warning-text, #B45309)",

          danger: "var(--jaama-color-status-danger, #DC2626)",
          "danger-subtle": "var(--jaama-color-status-danger-subtle, #FEE2E2)",
          "danger-border": "var(--jaama-color-status-danger-border, #FCA5A5)",
          "danger-text": "var(--jaama-color-status-danger-text, #B91C1C)",

          info: "var(--jaama-color-status-info, #2563EB)",
          "info-subtle": "var(--jaama-color-status-info-subtle, #EFF6FF)",
          "info-border": "var(--jaama-color-status-info-border, #BFDBFE)",
          "info-text": "var(--jaama-color-status-info-text, #1D4ED8)",

          neutral: "var(--jaama-color-status-neutral, #64748B)",
          "neutral-subtle": "var(--jaama-color-status-neutral-subtle, #F1F5F9)",
          "neutral-border": "var(--jaama-color-status-neutral-border, #E2E8F0)",
          "neutral-text": "var(--jaama-color-status-neutral-text, #334155)",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--jaama-radius-sm, 0.25rem)",
        md: "var(--jaama-radius-md, 0.5rem)",
        lg: "var(--jaama-radius-lg, 0.75rem)",
        full: "var(--jaama-radius-full, 9999px)",
      },
      boxShadow: {
        subtle: "var(--jaama-shadow-subtle)",
        card: "var(--jaama-shadow-card)",
        elevated: "var(--jaama-shadow-elevated)",
      },
    },
  },
};
