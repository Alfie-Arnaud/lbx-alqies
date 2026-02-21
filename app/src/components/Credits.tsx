import { Github, Instagram, Film } from 'lucide-react';

export function Credits() {
  return (
    <footer className="mt-20 pt-10 pb-8 border-t border-[#E8C547]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8C547] to-[#00C8FF] flex items-center justify-center">
              <Film className="w-5 h-5 text-[#0a0a0b]" />
            </div>
            <span className="text-xl font-semibold text-white">CinemaLog</span>
          </div>

          {/* Credits */}
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-2">Crafted with obsession by</p>
            <div className="group relative inline-block">
              <span className="credits-name text-xl">✦ Muhammad Alfiqisi Ilham ✦</span>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-[#1a1a1d] border border-white/10 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                The mind behind the madness 👾
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4 mb-8">
            <a
              href="https://github.com/karawasthere"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <Github className="w-4 h-4" />
              <span className="text-sm">GitHub</span>
            </a>
            <a
              href="https://instagram.com/diedbyenvy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-sm">Instagram</span>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} CinemaLog. All rights reserved.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Film data provided by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E8C547] hover:underline"
            >
              TMDB
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Credits;
