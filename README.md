# 🎬 Alfie's Basement

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)

A cinematic film tracking platform with a luxurious dark interface. Track your watched films, write reviews, and discover new movies with an immersive experience.

---

## ✨ Features

### 🎥 Film Tracking
- ✅ **Mark as Watched** — Keep track of films you've seen
- ⭐ **Rate Films** — 0.5–5 stars with half-star precision
- 📝 **Write Reviews** — Share your thoughts with spoiler tags
- 📌 **Watchlist** — Save films to watch later
- 🎯 **Auto-Rating Sync** — IMDb ratings automatically update when films are watched

### 👤 User Profiles
- 🖼️ **Custom Avatars** — Upload your own profile picture
- 🎨 **Profile Banners** — Search and set film backdrops as your banner (Pro/Patron)
- 📊 **Watch Statistics** — Films watched, hours spent, reviews written
- 📍 **Custom Locations** — Set any location (real or fictional!)
- 🎭 **Public Profiles** — Share your film journey with others
- 👥 **Follow System** — Follow other cinephiles

### 🔍 Discovery
- 🔎 **Film Search** — Powered by TMDB API
- 🏆 **Top 250** — Curated list with cinematic backdrop display
- 🎬 **Film Details** — Cast, crew, trailers, and more
- 🌐 **Multi-Backdrop Picker** — Choose from multiple film images

### 🎭 Membership Tiers
- **Patron** — Premium supporter badge + custom profile banner
- **Pro** — Advanced features + custom profile banner
- **Lifetime** — Permanent Pro access + custom profile banner
- **Free** — Standard access to all core features

---

## 🎨 Design System

### Color Palette
```css
--bg:          #0a0a0b;       /* Deep black background */
--surface:     #111113;       /* Card backgrounds */
--primary:     #E8C547;       /* Gold accent (Alfie's) */
--accent:      #00C8FF;       /* Cyan highlight (Basement) */
--text:        #E8E8E8;       /* Primary text */
--text-muted:  #6B7280;       /* Secondary text */
```

### Typography
- **Headings:** Playfair Display (serif elegance)
- **Body:** Inter (clean readability)

### Key UI Elements
- **Cinematic Home Page** — Ken Burns effect slideshow with crossfade transitions
- **Adaptive Banners** — 4:1 aspect ratio, full-cover responsive design
- **Glass Morphism** — Subtle translucent cards
- **Vignette Overlay** — Film-like darkened edges
- **Smooth Animations** — Fade transitions and hover effects

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Custom CSS
- **Routing:** React Router v6
- **Icons:** Lucide React
- **API Integration:** TMDB (The Movie Database)

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT with httpOnly cookies
- **Security:** bcrypt, express-rate-limit, CORS
- **File Uploads:** Multer (avatar images)

### Key Features Implementation
- **Real-time Announcements** — Polling system with localStorage persistence
- **Auto-update Ratings** — TMDB API fetch on film watch
- **Multi-backdrop Selection** — TMDB /images endpoint integration
- **Role-based Access Control** — Middleware guards for protected routes

---

## 📁 Project Structure

```
lbx-alqies/
├── app/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── FilmCard.tsx
│   │   │   ├── FilmGrid.tsx
│   │   │   ├── ReviewCard.tsx
│   │   │   └── RoleBadge.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Film.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Top250Page.tsx
│   │   │   └── Search.tsx
│   │   ├── hooks/          # Custom React hooks
│   │   │   └── useAuth.ts
│   │   └── App.tsx
│   └── dist/               # Build output
│
├── backend/                # Node.js + Express backend
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── films.js        # Film tracking routes
│   │   ├── reviews.js      # Review CRUD routes
│   │   └── admin.js        # Admin panel routes
│   ├── models/
│   │   ├── user.js         # User database model
│   │   └── film.js         # Film database model
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   └── roleGuard.js    # Role-based access control
│   └── db/
│       └── cinema.db       # SQLite database
│
└── README.md
```

---

## 📊 Database Schema

### Users Table
- Profile info (username, email, display name, bio, location)
- Avatar URL (uploaded images)
- Banner URL (TMDB backdrop or custom URL)
- Role (owner, higher_admin, admin, patron, pro, lifetime, free)

### Films Table
- TMDB ID, title, poster, backdrop
- Vote average & count (auto-synced from TMDB)
- Release date, runtime, genres

### User Films Table
- Watch status, rating, watched date

### Reviews Table
- Content, rating, spoiler tags
- Timestamps, likes count

---

## 🙏 Credits

**Originally created as Cinema Log**

Developed and maintained by:

**✦ Alqis (Muhammad Alfiqisi Ilham) ✦**
- Lead Developer & Designer
- [![GitHub](https://img.shields.io/badge/GitHub-@karawasthere-181717?logo=github)](https://github.com/karawasthere)
- [![Instagram](https://img.shields.io/badge/Instagram-@diedbyenvy-E4405F?logo=instagram)](https://instagram.com/diedbyenvy)

**✦ Dimas (Algas) ✦**
- Co-Developer & Contributor

---

<p align="center">
  <strong>Alfie's Basement</strong> — Where cinema lives underground.
</p>

<p align="center">
  Made with 🎬 and ☕
</p>