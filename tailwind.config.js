/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
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
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      spacing: {
        '88': '22rem',
      },
      typography: {
        DEFAULT: {
          css: {
            h1: {
              fontSize: '2.75rem',
              lineHeight: '1.15',
              marginTop: '2.75rem',
              marginBottom: '1.1rem',
              fontWeight: '700',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontSize: '2.2rem',
              lineHeight: '1.2',
              marginTop: '2.25rem',
              marginBottom: '0.95rem',
              fontWeight: '600',
            },
            h3: {
              fontSize: '1.7rem',
              lineHeight: '1.3',
              marginTop: '1.75rem',
              marginBottom: '0.85rem',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
