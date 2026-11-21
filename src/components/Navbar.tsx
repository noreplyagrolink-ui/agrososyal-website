import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const links = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/verify", label: "Agro Verify" },
  { to: "/privacy", label: "Gizlilik" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-0 right-0 z-50 mx-auto w-[calc(100%-1.5rem)] max-w-5xl px-0"
    >
      <div className="glass rounded-[28px] shadow-card">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[10px] icon-container-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="text-foreground font-semibold text-lg tracking-tight">
              Agro <span className="text-gradient">PAY</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative px-4 py-2 text-[13px] font-medium transition-colors duration-200 rounded-full"
              >
                <span className={location.pathname === link.to ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>
                  {link.label}
                </span>
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-full bg-secondary"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            <div className="w-px h-5 bg-border mx-2" />
            <button
              onClick={toggleTheme}
              aria-label="Temayı değiştir"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              to="/auth"
              className="px-5 py-2 rounded-full bg-gradient-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-all duration-300 hover:shadow-glow"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label="Temayı değiştir"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground p-1"
              aria-label="Menü"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden"
            >
              <div className="section-divider" />
              <div className="px-5 py-4 flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      location.pathname === link.to
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium text-center"
                >
                  Giriş Yap
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;

