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
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: `calc(var(--radius) - 4px)`,
      },
      boxShadow: {
        'custom': '0 4px 30px rgba(0, 0, 0, 0.1)',
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
