# GitWiki Frontend • Bento Design System

Modern, component-based frontend for the GitWiki RAG engine built with **React**, **Vite**, **TanStack Query (v5)**, and strictly styled with the **Bento Design System Skill**.

---

## 🍱 Bento Design System Tokens & Foundations

- **Visual Style**: Clean, modular, tactile bento boxes with 20px–28px rounded corners.
- **Color Palette Tokens**:
  - Primary (`#FAD4C0`): Warm peach / apricot for primary accents, badges, and highlights.
  - Secondary (`#80A1C1`): Calm slate blue for query actions, active borders, and focus rings.
  - Success (`#16A34A`): Online telemetry and high-confidence vector matches.
  - Warning (`#D97706`): Telemetry alerts and prompts.
  - Danger (`#DC2626`): Validation and network errors.
  - Surface (`#FFF5E6`): Warm off-white serene background.
  - Card (`#FFFFFF`): Crisp elevated container surfaces with soft ambient drop shadows.
  - Text (`#111827`): Deep slate off-black for high contrast readability.
- **Typography**:
  - Primary & Display: **Inter** (`12 / 14 / 16 / 20 / 24 / 32` px scale)
  - Monospace: **JetBrains Mono** for vector namespaces, code chunks, and latencies.
- **Accessibility**:
  - WCAG 2.2 AA compliant.
  - Keyboard-first interaction (e.g. `Ctrl + Enter` to search).
  - Explicit `focus-visible:ring-2 focus-visible:ring-bento-secondary` on all inputs and controls.

---

## ⚡ Tech Stack & Architecture

- **Framework**: React 18 + Vite
- **Server State Management**: `@tanstack/react-query` v5 (`useQuery`, `useMutation`, caching, automatic background invalidation)
- **Styling**: Tailwind CSS with custom Bento design tokens
- **Icons**: Lucide React
- **API Proxy**: Forwarded directly via Vite config `/api` -> `http://localhost:3000`

---

## 🧩 Component-Based Structure

```
frontend/src/
├── components/
│   ├── bento/
│   │   ├── BentoGrid.jsx          # 12-column responsive layout grid
│   │   └── BentoCard.jsx          # Modular bento container (col/row spans, headers, glows)
│   ├── indexing/
│   │   ├── IndexRepoCard.jsx      # GitHub repository ingestion & Inngest trigger
│   │   └── RecentReposCard.jsx    # Quick namespace selector & localStorage history
│   ├── query/
│   │   ├── QueryRepoCard.jsx      # Natural language search, top-K slider & suggestions
│   │   ├── AnswerCard.jsx         # Synthesized GPT-4o-mini markdown output & copy action
│   │   └── SourcesCard.jsx        # Pinecone similarity hits, % scores & code snippets
│   ├── system/
│   │   ├── SystemStatusCard.jsx   # Live server health & cloud engine telemetry
│   │   └── PipelineFlowCard.jsx   # 4-stage RAG architecture visualization
│   └── layout/
│       ├── Header.jsx             # Top bar with status pill & repo indicator
│       └── Footer.jsx             # Accessible design system footer
├── services/
│   └── api.js                     # TanStack Query fetchers and error handlers
├── utils/
│   └── cn.js                      # Tailwind class merger
├── App.jsx                        # Root dashboard container
├── main.jsx                       # QueryClientProvider mounting
└── index.css                      # Tailwind directives & Bento styles
```

---

## 🚀 Running the Project

### Start Frontend Dev Server
```bash
npm run dev
# Server accessible at http://localhost:5173
```

### Start Backend API
```bash
cd ../company-ocr
npm run dev
# Backend running on http://localhost:3000
```
