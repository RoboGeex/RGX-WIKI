# Firebase Studio Prompt: RGX Kits Wiki - Complete Project Recreation

## Project Overview
Create a modern, Arduino-style lesson wiki platform called "RGX Kits Wiki" using Next.js 14, TypeScript, and Tailwind CSS. This is a comprehensive educational platform with multi-language support (English/Arabic), content management system, and beautiful glass morphism design.

## Technology Stack
- **Framework**: Next.js 14 with App Router (Core Framework)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom glass morphism effects
- **Rich Text Editor**: TipTap with multiple extensions
- **Icons**: Lucide React
- **Internationalization**: Custom i18n system (English/Arabic with RTL support)
- **Database**: Optional Prisma with MySQL (can use JSON files for simplicity)
- **Deployment**: Standalone build for static hosting

## Key Framework Details
**Next.js 14**: This project is built entirely on Next.js 14 with the App Router architecture. All routing, API routes, and server-side functionality uses Next.js conventions.

## Color Scheme & Design System
**Primary Brand Color**: `#f05d4e` (HSL: 6 86% 60%)
**Design System**: Glass morphism with backdrop blur effects, custom CSS variables for theming, and a modern gradient-based color palette with proper contrast ratios for accessibility.

## Core Features
1. **Multi-language Support**: English (LTR) and Arabic (RTL) with proper font handling
2. **Subdomain Routing**: Dynamic subdomain-based wiki access (e.g., `arduino.localhost` → `localhost/en/arduino`)
3. **Content Management**: Full CRUD operations for wikis, kits, lessons, and modules
4. **Rich Text Editor**: Advanced editor with tables, code blocks, images, YouTube embeds
5. **Glass Morphism UI**: Modern design with backdrop blur effects and gradients
6. **Responsive Design**: Mobile-first approach with collapsible navigation
7. **Search Functionality**: Real-time lesson search with filtering
8. **Access Control**: Unlock mechanism for protected content

## Project Structure

### Root Files
```
rgx-kits-wiki/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── middleware.ts
├── README.md
└── README_DB.md
```

### App Directory Structure
```
app/
├── layout.tsx                 # Root layout with Inter font
├── page.tsx                   # Redirects to first available wiki
├── globals.css               # Global styles with CSS variables
├── providers.tsx             # Client providers wrapper
├── not-found.tsx             # 404 page
├── unlock/page.tsx           # Access code entry page
├── [locale]/
│   ├── layout.tsx            # Locale layout with unlock guard
│   └── [kit]/
│       ├── layout.tsx        # Kit layout with navigation
│       ├── page.tsx          # Kit landing page
│       └── lesson/[slug]/page.tsx  # Individual lesson page
├── editor/
│   ├── page.tsx              # Editor dashboard
│   ├── dashboard/
│   │   ├── page.tsx          # Main editor dashboard
│   │   ├── editor-dashboard-client.tsx
│   │   └── [wiki]/page.tsx   # Wiki-specific editor
│   ├── lesson/page.tsx       # Lesson editor
│   └── properties/page.tsx   # Wiki properties editor
├── dashboard/page.tsx        # Student dashboard
├── student/page.tsx          # Student view
├── lessons/[id]/page.tsx     # Lesson viewer
└── api/
    ├── wikis/route.ts        # Wiki CRUD operations
    ├── lessons/route.ts      # Lesson CRUD operations
    ├── lessons/[id]/route.ts # Individual lesson operations
    ├── lessons/reorder/route.ts # Lesson reordering
    ├── modules/route.ts      # Module operations
    └── upload/route.ts       # File upload handling
```

### Components Directory
```
components/
├── navbar.tsx                # Main navigation with search
├── sidebar.tsx               # Collapsible lesson navigation
├── breadcrumbs.tsx           # Breadcrumb navigation
├── lesson-meta-card.tsx      # Lesson metadata sidebar
├── materials-list.tsx        # Required materials list
├── step.tsx                  # Numbered lesson steps
├── callout.tsx               # Info/tip/warning callouts
├── code-tabs.tsx             # Arduino/micro:bit code tabs
├── prev-next-nav.tsx         # Lesson navigation
├── search-panel.tsx          # Search results dropdown
├── dashboard-navbar.tsx      # Editor navigation
├── admin-navbar.tsx          # Admin navigation
├── kit-navbar.tsx            # Kit-specific navigation
├── dashboard-layout.tsx      # Dashboard layout wrapper
├── create-wiki-modal.tsx     # Wiki creation modal
├── lesson-toc.tsx            # Table of contents
├── rich-text-editor.tsx      # Rich text editor component
└── editor/
    ├── Editor.tsx            # Main TipTap editor
    ├── PropertiesForm.tsx    # Lesson properties form
    ├── LessonsReorderList.tsx # Drag-and-drop lesson reordering
    ├── SlashCommand.ts       # Slash command functionality
    └── extensions/
        └── TableCellWithBackground.ts # Custom table cell extension
```

### Data Directory
```
data/
├── wikis.json                # Wiki definitions
├── kits.json                 # Kit definitions
├── lessons.{wiki-slug}.json  # Lesson content per wiki
└── modules.{wiki-slug}.json  # Module structure per wiki
```

### Library Directory
```
lib/
├── data.ts                   # Data loading utilities
├── i18n.ts                   # Internationalization helpers
├── unlock.ts                 # Access control utilities
├── lesson-loader.ts          # Lesson loading logic
├── server-data.ts            # Server-side data operations
├── prisma.ts                 # Database connection (optional)
└── wiki.ts                   # Wiki utilities
```

## Key Configuration Files

### package.json
```json
{
  "name": "rgx-kits-wiki",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@tailwindcss/typography": "^0.5.10",
    "@tiptap/extension-bubble-menu": "^3.4.1",
    "@tiptap/extension-code-block-lowlight": "^3.4.1",
    "@tiptap/extension-color": "^3.4.1",
    "@tiptap/extension-highlight": "^3.4.1",
    "@tiptap/extension-image": "^3.4.1",
    "@tiptap/extension-placeholder": "^3.4.1",
    "@tiptap/extension-table": "^3.4.1",
    "@tiptap/extension-table-cell": "^3.4.1",
    "@tiptap/extension-table-header": "^3.4.1",
    "@tiptap/extension-table-row": "^3.4.1",
    "@tiptap/extension-text-style": "^3.4.1",
    "@tiptap/extension-underline": "^3.4.1",
    "@tiptap/extension-youtube": "^3.4.1",
    "@tiptap/react": "^3.4.1",
    "@tiptap/starter-kit": "^3.4.1",
    "@tiptap/suggestion": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "clsx": "^2.0.0",
    "lowlight": "^3.3.0",
    "lucide-react": "^0.294.0",
    "next": "14.0.0",
    "postcss": "^8.4.31",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.9.0",
    "@types/react": "^18.2.38",
    "@types/react-dom": "^18.2.17",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.0",
    "typescript": "^5.2.2"
  }
}
```

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  productionBrowserSourceMaps: false,
  trailingSlash: false,
  poweredByHeader: false,
}

module.exports = nextConfig
```

### tailwind.config.js
```javascript
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
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
```

### middleware.ts
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain from hostname (remove port if present)
  const hostnameWithoutPort = hostname.split(':')[0]
  const subdomain = hostnameWithoutPort.split('.')[0]
  
  // Skip if it's localhost, www, or already has a locale
  if (subdomain === 'localhost' || subdomain === 'www' || subdomain === '127' || subdomain === '0') {
    return NextResponse.next()
  }
  
  // Skip if it's already a locale-based route
  if (url.pathname.startsWith('/en/') || url.pathname.startsWith('/ar/')) {
    return NextResponse.next()
  }
  
  // Redirect subdomain to locale-based route
  // e.g., osama-kanan.localhost -> localhost/en/osama-kanan
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const newUrl = new URL(`/en/${subdomain}`, baseUrl)
  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Data Models

### Wiki Interface
```typescript
interface Wiki {
  slug: string
  displayName: string
  grade: string
  picture: string
  domains: string[]
  defaultLocale: string
  defaultLessonSlug: string
  resourcesUrl: string
  createdAt: string
}
```

### Kit Interface
```typescript
interface Kit {
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  heroImage: string
  overview_en: string
  overview_ar: string
}
```

### Lesson Interface
```typescript
interface Lesson {
  id: string
  order: number
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  duration_min: number
  difficulty: string
  prerequisites_en: string[]
  prerequisites_ar: string[]
  materials: Material[]
  body: LessonBodyItem[]
  createdAt?: string
  updatedAt?: string
}

interface LessonBodyItem {
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image'
  en?: string
  ar?: string
  title_en?: string
  title_ar?: string
  caption_en?: string
  caption_ar?: string
  variant?: 'info' | 'tip' | 'warning'
  image?: string
  arduino?: string
  makecodeUrl?: string
  level?: number
}
```

### Module Interface
```typescript
interface Module {
  id: string
  order: number
  title_en: string
  title_ar: string
  summary_en?: string
  summary_ar?: string
}
```

## Key Features Implementation

### 1. Internationalization (i18n)
- Custom translation system in `lib/i18n.ts`
- RTL support for Arabic with proper font handling
- Locale-based routing with `[locale]` dynamic segments
- Language switcher in navigation

### 2. Subdomain Routing
- Middleware handles subdomain detection and redirection
- Dynamic wiki access via subdomains (e.g., `arduino.localhost`)
- Fallback to main domain with locale-based routing

### 3. Rich Text Editor
- TipTap-based editor with multiple extensions
- Support for tables, code blocks, images, YouTube embeds
- Slash commands for quick content insertion
- Bubble menu for text formatting

### 4. Content Management
- Full CRUD operations for wikis, kits, lessons, modules
- File upload handling for images and media
- Lesson reordering with drag-and-drop
- Wiki creation with automatic file generation

### 5. Glass Morphism UI
- Custom CSS variables for theming
- Backdrop blur effects with `glass` utility class
- Gradient backgrounds and modern card designs
- Responsive design with mobile-first approach

### 6. Search Functionality
- Real-time lesson search with filtering
- Search panel with dropdown results
- Client-side search with debouncing

### 7. Access Control
- Unlock mechanism for protected content
- Session-based access control
- Access code entry page

## Sample Data Structure

### wikis.json
```json
[
  {
    "slug": "student-kit",
    "displayName": "Student Kit",
    "grade": "All Levels",
    "picture": "/images/robogeex-logo.png",
    "domains": [
      "student-kit.localhost",
      "localhost",
      "127.0.0.1"
    ],
    "defaultLocale": "en",
    "defaultLessonSlug": "getting-started",
    "resourcesUrl": "/resources",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### kits.json
```json
[
  {
    "slug": "student-kit",
    "wikiSlug": "student-kit",
    "title_en": "Arduino Student Kit",
    "title_ar": "Arduino Student Kit",
    "heroImage": "/images/student-kit-hero.jpg",
    "overview_en": "Learn electronics and programming with hands-on projects using Arduino UNO.",
    "overview_ar": "Learn electronics and programming with hands-on projects using Arduino UNO."
  }
]
```

### lessons.{wiki-slug}.json
```json
[
  {
    "id": "getting-started",
    "wikiSlug": "student-kit",
    "order": 1,
    "slug": "getting-started",
    "title_en": "Getting Started",
    "title_ar": "البداية",
    "duration_min": 30,
    "difficulty": "Beginner",
    "prerequisites_en": [],
    "prerequisites_ar": [],
    "materials": [],
    "body": [
      {
        "type": "heading",
        "en": "Getting Started",
        "level": 1,
        "ar": "البداية"
      },
      {
        "type": "paragraph",
        "en": "Welcome to this lesson. Here we will learn about the basics.",
        "ar": "مرحباً بك في هذا الدرس. هنا سوف نتعلم الأساسيات."
      }
    ]
  }
]
```

## CSS Custom Properties
```css
:root {
  --background: 210 40% 96%;
  --foreground: 0 0% 12%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 12%;
  --primary: 6 86% 60%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 0 0% 12%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 0 0% 12%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 6 86% 60%;
  --radius: 0.75rem;
}
```

## Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Access at `http://localhost:3000`
4. Navigate to `/unlock` to enter access code
5. Use `/editor` for content management

## Deployment
- Build: `npm run build`
- Start: `npm run start`
- Output: Standalone build for static hosting
- Images: Unoptimized for compatibility

## Key Implementation Notes
1. **Client-Server Separation**: Avoid importing server-side functions in client components
2. **Dynamic Imports**: Use dynamic imports for file system operations
3. **Error Handling**: Comprehensive error handling for file operations
4. **Type Safety**: Full TypeScript coverage with proper interfaces
5. **Performance**: Optimized for static generation and fast loading
6. **Accessibility**: Proper ARIA labels and keyboard navigation
7. **SEO**: Meta tags and proper HTML structure

This project represents a complete educational platform with modern web technologies, comprehensive content management, and beautiful user interface design. The architecture supports scalability and can be easily extended with additional features.
