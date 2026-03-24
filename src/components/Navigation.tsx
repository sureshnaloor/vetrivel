import { useState, useEffect } from 'react';
import { Menu, X, LogIn, LogOut, LayoutDashboard, Sun, Moon } from 'lucide-react';
import SacredSpacesLogo from './SacredSpacesLogo';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Explore', href: '#explore' },
    { label: 'Pin', href: '#pin' },
    { label: 'Community', href: '#community' },
    { label: 'Book', href: '#book' },
    { label: 'Contact', href: '#contact' },
  ];

  const scrollToSection = (href: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-500 ${
          isScrolled
            ? isDark
              ? 'bg-[#0a0a0a]/90 backdrop-blur-md py-4 shadow-sm shadow-white/5'
              : 'bg-[#F4F1EA]/90 backdrop-blur-md py-4 shadow-sm'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="w-full px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            className={`flex items-center gap-2 transition-colors ${isDark ? 'text-white hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}
            onClick={(e) => {
              e.preventDefault();
              if (location.pathname !== '/') {
                navigate('/');
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <SacredSpacesLogo size={32} />
            <span className="font-display text-xl font-semibold tracking-tight">
              SacredSpaces
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className={`text-sm font-medium transition-colors duration-200 ${isDark ? 'text-gray-300 hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}
              >
                {link.label}
              </button>
            ))}
            {isAuthenticated && (
              <Link to="/dashboard" className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${isDark ? 'text-gray-300 hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            )}
            {isScrolled && (
              <button className="btn-primary text-sm py-2 px-4">
                Add a place
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-white/10 text-yellow-300 hover:bg-white/20' : 'bg-black/5 text-gray-600 hover:bg-black/10'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className={`ml-2 border-l pl-4 ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
              {loading ? (
                <div className="w-20 h-8" /> /* Invisible placeholder while loading */
              ) : isAuthenticated ? (
                <button onClick={logout} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-300 hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}>
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              ) : (
                <button onClick={login} className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors ${isDark ? 'bg-white text-black hover:bg-[#E8724A] hover:text-white' : 'bg-[#141414] text-[#F4F1EA] hover:bg-[#D13B3B]'}`}>
                  <LogIn className="w-4 h-4" /> Login
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-white/10 text-yellow-300' : 'bg-black/5 text-gray-600'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              className={`p-2 ${isDark ? 'text-white' : 'text-[#141414]'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-[999] transition-transform duration-500 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F1EA]'}`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollToSection(link.href)}
              className={`font-display text-3xl transition-colors ${isDark ? 'text-white hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}
            >
              {link.label}
            </button>
          ))}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`font-display text-3xl transition-colors ${isDark ? 'text-white hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}
            >
              Dashboard
            </Link>
          )}
          <button className="btn-primary mt-4">Add a place</button>
          
          <div className="mt-8">
            {loading ? null : isAuthenticated ? (
              <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className={`flex items-center gap-2 text-xl font-display transition-colors ${isDark ? 'text-white hover:text-[#E8724A]' : 'text-[#141414] hover:text-[#D13B3B]'}`}>
                <LogOut className="w-5 h-5" /> Logout
              </button>
            ) : (
              <button onClick={() => { login(); setIsMobileMenuOpen(false); }} className={`flex items-center gap-2 text-xl font-display px-6 py-3 rounded-full transition-colors ${isDark ? 'bg-white text-black hover:bg-[#E8724A] hover:text-white' : 'bg-[#141414] text-[#F4F1EA] hover:bg-[#D13B3B]'}`}>
                <LogIn className="w-5 h-5" /> Login
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
