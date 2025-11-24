# RGX Kits Wiki

A modern, Arduino-style lesson wiki built with Next.js 14, TypeScript, and Tailwind CSS. Features multi-language support (English/Arabic), dark mode, and a beautiful glass morphism design.

## Features

- 🚀 **Next.js 14** with App Router
- 🎨 **Modern UI** with glass morphism and gradients
- 🌍 **i18n Support** (English/Arabic with RTL)
- 🌙 **Dark Mode** with next-themes
- 📱 **Responsive Design** with mobile sidebar
- 🔍 **Client-side Search** with real-time filtering
- 📚 **Rich Content** support (steps, callouts, code tabs, embeds)
- 🔒 **Access Control** with unlock mechanism
- ⚡ **Fast & Optimized** static generation

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to `/unlock` to enter the wiki.

### Build & Deploy

```bash
npm run build
npm run start
```

## Project Structure

```
app/
├── layout.tsx                 # Root layout with theme provider
├── globals.css               # Global styles with CSS variables
├── unlock/page.tsx           # Access code entry page
├── [locale]/
│   ├── layout.tsx            # Locale layout with unlock guard
│   └── [kit]/
│       ├── layout.tsx        # Kit layout with navigation
│       ├── page.tsx          # Kit landing page
│       └── lesson/[slug]/page.tsx  # Individual lesson page
├── not-found.tsx            # 404 page

components/
├── navbar.tsx               # Top navigation with search
├── sidebar.tsx              # Collapsible lesson navigation
├── breadcrumbs.tsx          # Breadcrumb navigation
├── lesson-meta-card.tsx     # Lesson metadata sidebar
├── materials-list.tsx       # Required materials list
├── step.tsx                 # Numbered lesson steps
├── callout.tsx              # Info/tip/warning callouts
├── code-tabs.tsx            # Arduino/micro:bit code tabs
├── prev-next-nav.tsx        # Lesson navigation
└── search-panel.tsx         # Search results dropdown

data/
├── kits.json                # Kit definitions
├── modules.student-kit.json # Module structure per kit
└── lessons.student-kit.json # Lesson content with i18n

lib/
├── data.ts                  # Data loading utilities
├── i18n.ts                  # Internationalization helpers
└── unlock.ts                # Access control utilities
```

## Content Management

### Adding a New Lesson

1. **Add lesson data** to the appropriate `lessons.{kit}.json` file:

```json
{
  "id": "new-lesson",
  "moduleId": "intro",
  "order": 2,
  "slug": "new-lesson",
  "title_en": "New Lesson",
  "title_ar": "درس جديد",
  "duration_min": 30,
  "difficulty": "Beginner",
  "prerequisites_en": ["Previous lesson"],
  "prerequisites_ar": ["الدرس السابق"],
  "materials": [...],
  "body": [...]
}
```

2. **Add images** to `/public/images/` (referenced in lesson body)

3. **Restart dev server** to load new content

### Content Types

The lesson `body` array supports these content types:

- **paragraph**: Simple text content
- **step**: Numbered steps with optional images
- **callout**: Info/tip/warning boxes with icons
- **codeTabs**: Arduino code + micro:bit MakeCode embed

### Supported Languages

- **English** (`en`): Left-to-right layout
- **Arabic** (`ar`): Right-to-left layout with RTL-aware components

All content should include both `_en` and `_ar` variants.

## Configuration

### Theme Customization

Edit `tailwind.config.js` and `app/globals.css` to customize:
- Color scheme (CSS variables)
- Border radius and shadows
- Glass morphism effects

### Adding New Kits

1. Create new kit entry in `data/kits.json`
2. Create `data/modules.{kit-slug}.json`
3. Create `data/lessons.{kit-slug}.json`
4. Update data loading logic in `lib/data.ts`

### Access Control

The unlock mechanism uses localStorage per hostname:
- Key: `unlocked:{hostname}`
- Any non-empty access code unlocks the content
- Implement server-side validation for production

## Development Notes

- **Static Generation**: All lesson content is statically generated
- **Client-side Routing**: Navigation preserves scroll position
- **Search**: Client-side fuzzy search over lesson titles
- **Responsive**: Mobile-first design with collapsible sidebar
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Deployment

The app is built for static hosting. Deploy the `out/` folder after running:

```bash
npm run build
```

Recommended platforms: Vercel, Netlify, GitHub Pages

## License

Private project for RoboGeex educational content.