import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // --- Catalog design tokens (ported from robogeex_courses) ---
        // Additive only: neither `brand` nor `ink` existed before, so these
        // cannot change how any existing page renders.
        brand: {
          DEFAULT: '#f05d4e',
          50: '#fef1ef',
          100: '#fdddd8',
          200: '#fbb8af',
          300: '#f89486',
          400: '#f4715d',
          500: '#f05d4e',
          600: '#d44537',
          700: '#a8362c',
          800: '#7b2820',
          900: '#4f1914',
        },
        ink: {
          DEFAULT: '#1f1f1f',
          soft: '#343434',
          muted: '#6b7280',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: `calc(var(--radius) - 4px)`,
        // Catalog cards. Safe: no `card` key exists in borderRadius.
        card: '1rem',
      },
      boxShadow: {
        'custom': '0 4px 30px rgba(0, 0, 0, 0.1)',
        // NOTE: deliberately named `course`, NOT `card`. `colors.card` already
        // exists above (shadcn token), and in Tailwind a `boxShadow.card` key
        // would make `shadow-card` ambiguous/inert. Use `shadow-course`.
        course: '0 6px 24px -8px rgba(31,31,31,0.12)',
      },
      spacing: {
        '88': '22rem',
      },
      typography: {
        DEFAULT: {
          css: {
            h1: {
              fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
              lineHeight: '1.2',
              marginTop: 'clamp(1.5rem, 4vw, 2.25rem)',
              marginBottom: 'clamp(1rem, 3vw, 1.25rem)',
              fontWeight: '750',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
              lineHeight: '1.3',
              marginTop: 'clamp(1.25rem, 3vw, 1.875rem)',
              marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
              fontWeight: '650',
            },
            h3: {
              fontSize: 'clamp(1.25rem, 3vw, 1.375rem)',
              lineHeight: '1.4',
              marginTop: 'clamp(1rem, 2vw, 1.5rem)',
              marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
