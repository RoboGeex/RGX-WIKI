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
              fontSize: '3.25rem',
              lineHeight: '1.1',
              marginTop: '3rem',
              marginBottom: '1.2rem',
              fontWeight: '750',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontSize: '2.35rem',
              lineHeight: '1.2',
              marginTop: '2.4rem',
              marginBottom: '1rem',
              fontWeight: '650',
            },
            h3: {
              fontSize: '1.5rem',
              lineHeight: '1.3',
              marginTop: '1.6rem',
              marginBottom: '0.8rem',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
