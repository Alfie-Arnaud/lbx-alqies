# 🎬 CinemaLog

[![Deploy to GitHub Pages](https://github.com/yourusername/cinemalog/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/cinemalog/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

A luxury, cinematic film tracking application inspired by Letterboxd. Track films, TV series, and anime with a beautiful dark-themed interface.

![CinemaLog Preview](https://via.placeholder.com/800x400/0a0a0b/E8C547?text=CinemaLog)

## ✨ Features

### Film Tracking
- ✅ Mark films as **Watched**
- ✅ Add to **Watchlist**
- ✅ **Rate** films (0.5–5 stars, half-star increments)
- ✅ Write **Reviews** (with optional spoiler tags)
- ✅ **Film Diary** — log watches by date
- ✅ **Lists** — user-created custom collections

### Social Features
- 👤 User profiles with watch stats
- 👥 Follow / unfollow other users
- 📰 Activity feed
- ❤️ Like reviews
- 💬 Comment on reviews

### Discovery
- 🔍 Search films, series, anime via TMDB
- 🏆 **Top 250** — curated list of acclaimed films
- 🎭 Browse by genre
- 🔥 Popular this week
- 🆕 New releases

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- TMDB API key (free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cinemalog.git
cd cinemalog
```

2. **Setup Frontend**
```bash
cd frontend
npm install
```

3. **Setup Backend**
```bash
cd ../backend
npm install
```

4. **Environment Variables**

Create `.env` files:

**Frontend** (`frontend/.env`):
```env
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_super_secret_jwt_key
OWNER_EMAIL=your_email@example.com
TMDB_API_KEY=your_tmdb_api_key
```

5. **Run Development Servers**

Frontend:
```bash
cd frontend
npm run dev
```

Backend:
```bash
cd backend
npm run dev
```

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom CSS
- **Animations:** GSAP + Three.js (background)
- **Icons:** Lucide React
- **Fonts:** Playfair Display + Inter

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT with httpOnly cookies
- **Security:** bcrypt, express-rate-limit, CORS

### Deployment
- **Frontend:** GitHub Pages
- **Backend:** Railway / Render
- **CI/CD:** GitHub Actions

## 🎨 Design System

### Color Palette
```css
--bg:          #0a0a0b;       /* near-black */
--surface:     #111113;       /* card backgrounds */
--primary:     #E8C547;       /* gold accent */
--accent:      #00C8FF;       /* cyan highlight */
--text:        #E8E8E8;       /* primary text */
--text-muted:  #6B7280;       /* secondary text */
```

### Typography
- **Headings:** Playfair Display
- **Body:** Inter

## 👑 Owner Commands

| Command | Description |
|---------|-------------|
| `/stats` | Show site statistics |
| `/promote @user patron/pro/lifetime` | Promote a user |
| `/demote @user` | Demote user to free |
| `/ban @user` | Ban a user |
| `/unban @user` | Unban a user |
| `/broadcast <message>` | Send announcement |

## 🎭 Role System

| Role | Perks |
|------|-------|
| `owner` | Full admin access |
| `patron` | Premium badge, extended features |
| `pro` | Pro badge, advanced stats |
| `lifetime` | Permanent Pro access |
| `free` | Standard access |

## 📁 Project Structure

```
/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # Utility functions
│   │   └── data/        # Static data
│   └── dist/           # Build output
│
├── backend/           # Express.js backend
│   ├── routes/         # API routes
│   ├── models/         # Database models
│   ├── middleware/     # Auth & guards
│   └── db/            # Database files
│
└── .github/
    └── workflows/      # CI/CD workflows
```

## 🚀 Deployment

### Frontend (GitHub Pages)
1. Push to `main` branch
2. GitHub Actions auto-deploys to Pages
3. Configure `VITE_API_URL` secret

### Backend (Railway)
1. Connect Railway to GitHub repo
2. Set environment variables
3. Deploy automatically on push

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Films
- `GET /api/films/:tmdbId` - Get film details
- `POST /api/films/:tmdbId/watched` - Mark as watched
- `POST /api/films/:tmdbId/rate` - Rate film
- `POST /api/films/:tmdbId/watchlist` - Add to watchlist

### Reviews
- `GET /api/reviews/film/:tmdbId` - Get film reviews
- `POST /api/reviews` - Create review
- `POST /api/reviews/:id/like` - Like review

### Admin (Owner only)
- `GET /api/admin/stats` - Site statistics
- `GET /api/admin/users` - List users
- `POST /api/admin/command` - Execute command

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

Crafted with obsession by

**✦ Muhammad Alfiqisi Ilham ✦**

[![GitHub](https://img.shields.io/badge/GitHub-@karawasthere-181717?logo=github)](https://github.com/karawasthere)
[![Instagram](https://img.shields.io/badge/Instagram-@diedbyenvy-E4405F?logo=instagram)](https://instagram.com/diedbyenvy)

---

<p align="center">
  Made with 🎬 and ☕
</p>
