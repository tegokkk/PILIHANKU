import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Menu, X, Sprout, Settings, LogOut } from 'lucide-react';

export function Navbar1({
  manager = false,
  user = null,
  isConsultPanel = false,
  settingsActive = false,
  onOpenSettings,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null),
    triggerRef = useRef(null);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = menuRef.current;
    const trigger = triggerRef.current;
    const focusable = () => Array.from(dialog.querySelectorAll('a[href],button:not([disabled])'));
    focusable()[0]?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'Tab') {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  const navItems = manager
    ? [
        { to: '/guru', label: 'Dashboard', end: true },
        { to: '/guru/kelola', label: 'Kelola Informasi' },
      ]
    : [
        { to: '/', label: 'Beranda', end: true },
        { to: '/peta-jalur', label: 'Peta Jalur' },
        {
          to: '/rencana-langkahku?panel=konsultasi',
          label: 'Tanya BK',
          customActive: isConsultPanel,
        },
      ];

  const mobileExtraItems = manager
    ? []
    : [
        { to: '/kenali-diriku', label: 'Kenali Diriku' },
        { to: '/timbang-pilihan', label: 'Timbang Pilihan' },
        {
          to: '/rencana-langkahku',
          label: 'Rencana Langkahku',
          customActive: !isConsultPanel && location.pathname === '/rencana-langkahku',
        },
      ];

  return (
    <MotionConfig reducedMotion="user">
      <header className="site-header navbar-wrapper">
        <div className="navbar-pill">
          <div className="navbar-left">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to="/" className="brand navbar-brand" aria-label="PILIHANKU Beranda">
                <span className="navbar-brand-mark" aria-hidden="true">
                  <Sprout size={18} strokeWidth={2.2} />
                </span>
                <span>PILIHANKU</span>
              </Link>
            </motion.div>
          </div>

          <nav className="navbar-links" aria-label="Navigasi utama">
            {navItems.map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.customActive !== undefined ? (
                  <Link
                    to={item.to}
                    className={`navbar-link ${item.customActive ? 'active' : ''}`}
                    aria-current={item.customActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                )}
              </motion.div>
            ))}
          </nav>

          <motion.div
            className="navbar-actions"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.button
              type="button"
              className={`navbar-icon-btn ${settingsActive ? 'is-active' : ''}`}
              onClick={onOpenSettings}
              aria-label="Pengaturan Data"
              whileTap={{ scale: 0.94 }}
            >
              <Settings size={18} aria-hidden="true" />
            </motion.button>

            {user ? (
              <>
                <span className="navbar-identity" title={`${user.displayName} · ${user.role}`}>
                  {user.displayName} · {user.role}
                </span>
                <motion.button
                  type="button"
                  className="navbar-cta outline"
                  onClick={onLogout}
                  whileTap={{ scale: 0.96 }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Keluar</span>
                </motion.button>
              </>
            ) : (
              <motion.div whileTap={{ scale: 0.96 }}>
                <Link className="navbar-cta primary" to="/mulai?tab=masuk">
                  Masuk
                </Link>
              </motion.div>
            )}
          </motion.div>

          <div className="navbar-mobile-controls">
            <motion.button
              type="button"
              className={`navbar-icon-btn ${settingsActive ? 'is-active' : ''}`}
              onClick={onOpenSettings}
              aria-label="Pengaturan Data"
              whileTap={{ scale: 0.92 }}
            >
              <Settings size={18} aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              className="navbar-icon-btn"
              ref={triggerRef}
              onClick={toggleMenu}
              aria-label={isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={isOpen}
              whileTap={{ scale: 0.92 }}
            >
              <Menu size={20} aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="navbar-mobile-overlay"
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu navigasi"
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <div className="navbar-mobile-header">
                <Link
                  to="/"
                  className="brand navbar-brand"
                  aria-label="PILIHANKU Beranda"
                  onClick={closeMenu}
                >
                  <span className="navbar-brand-mark" aria-hidden="true">
                    <Sprout size={18} strokeWidth={2.2} />
                  </span>
                  <span>PILIHANKU</span>
                </Link>
                <motion.button
                  type="button"
                  className="navbar-icon-btn"
                  onClick={closeMenu}
                  aria-label="Tutup menu navigasi"
                  whileTap={{ scale: 0.92 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 }}
                >
                  <X size={20} aria-hidden="true" />
                </motion.button>
              </div>

              <div className="navbar-mobile-list">
                {[...navItems, ...mobileExtraItems].map((item, i) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ delay: i * 0.045 + 0.06, duration: 0.22 }}
                  >
                    {item.customActive !== undefined ? (
                      <Link
                        to={item.to}
                        className={`navbar-mobile-link ${item.customActive ? 'active' : ''}`}
                        aria-current={item.customActive ? 'page' : undefined}
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `navbar-mobile-link ${isActive ? 'active' : ''}`
                        }
                        onClick={closeMenu}
                      >
                        {item.label}
                      </NavLink>
                    )}
                  </motion.div>
                ))}

                <motion.div
                  className="navbar-mobile-footer"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{ delay: 0.26, duration: 0.22 }}
                >
                  {user && (
                    <p className="navbar-mobile-identity">
                      Masuk sebagai <strong>{user.displayName}</strong> · {user.role}
                    </p>
                  )}
                  <button
                    type="button"
                    className="navbar-cta outline full-width"
                    onClick={() => {
                      closeMenu();
                      onOpenSettings?.();
                    }}
                  >
                    <Settings size={17} aria-hidden="true" />
                    <span>Pengaturan Data</span>
                  </button>
                  {user ? (
                    <button
                      type="button"
                      className="navbar-cta primary full-width"
                      onClick={() => {
                        closeMenu();
                        onLogout?.();
                      }}
                    >
                      <LogOut size={17} aria-hidden="true" />
                      <span>Keluar</span>
                    </button>
                  ) : (
                    <Link
                      className="navbar-cta primary full-width"
                      to="/mulai?tab=masuk"
                      onClick={closeMenu}
                    >
                      Masuk
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </MotionConfig>
  );
}
