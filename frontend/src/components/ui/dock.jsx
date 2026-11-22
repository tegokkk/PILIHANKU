import { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';

export default function Dock({ items = [], className = '' }) {
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`dock-wrapper ${className}`.trim()}>
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="dock-bar"
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === item.label;
            const isHovered = hovered === i;

            return (
              <motion.div
                key={item.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  rotate: isHovered ? -5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="dock-item"
              >
                {isHovered && (
                  <span className="dock-tooltip" role="tooltip">
                    {item.label}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={item.label}
                  className={`dock-btn ${isHovered ? 'is-hovered' : ''} ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setActive(item.label);
                    item.onClick?.();
                  }}
                >
                  <Icon className="dock-icon" aria-hidden="true" />
                  {isHovered && (
                    <motion.span
                      layoutId="dock-glow"
                      className="dock-glow-ring"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </button>
                {isActive && <motion.div layoutId="dock-dot" className="dock-active-dot" />}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
