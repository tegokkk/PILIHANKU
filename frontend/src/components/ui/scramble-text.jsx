import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { prefersReducedMotion, useReducedMotion } from '../../hooks/useMotion.js';

gsap.registerPlugin(ScrambleTextPlugin);

const CHARACTER_SETS = {
  upperAndLowerCase: 'upperAndLowerCase',
  upperCase: 'upperCase',
  lowerCase: 'lowerCase',
  numbers: '0123456789',
  symbols: '!<>-_\\/[]{}=+*^?#',
};

export function ScrambleText({
  text,
  className = '',
  duration = 0.85,
  stagger = 0.04,
  delay = 0,
  blur = 4,
  scrambleSpeed = 0.9,
  characters = 'upperAndLowerCase',
  triggerOnView = true,
}) {
  const containerRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [inView, setInView] = useState(
    () => !triggerOnView || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()
  );
  const safeText = String(text ?? '');
  const words = safeText.split(' ');

  useEffect(() => {
    if (inView || !triggerOnView || reducedMotion) {
      setInView(true);
      return;
    }
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (rect.top < vh * 0.96 && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, triggerOnView, reducedMotion]);

  useGSAP(
    () => {
      const chars = containerRef.current?.querySelectorAll('.char') ?? [];
      if (!chars.length) return;

      if (reducedMotion) {
        gsap.set(chars, { opacity: 1, filter: 'none' });
        const original = safeText.replaceAll(' ', '');
        chars.forEach((node, index) => {
          node.textContent = original[index] || '';
        });
        return;
      }

      if (!inView) {
        gsap.set(chars, { opacity: 0, filter: `blur(${blur}px)` });
        return;
      }

      gsap.set(chars, { opacity: 0, filter: `blur(${blur}px)` });

      chars.forEach((char, index) => {
        const finalText = char.textContent || '';

        gsap.to(char, {
          opacity: 1,
          filter: 'blur(0px)',
          duration,
          delay: delay + index * Math.min(stagger, 0.5 / chars.length),
          ease: 'power2.out',
          scrambleText: {
            text: finalText,
            chars: CHARACTER_SETS[characters] || CHARACTER_SETS.upperAndLowerCase,
            speed: scrambleSpeed,
          },
        });
      });
    },
    {
      scope: containerRef,
      dependencies: [
        safeText,
        duration,
        stagger,
        delay,
        blur,
        scrambleSpeed,
        characters,
        inView,
        reducedMotion,
      ],
      revertOnUpdate: true,
    }
  );

  return (
    <span ref={containerRef} className={className}>
      <span className="sr-only">{safeText}</span>
      <span className="inline-flex flex-wrap gap-x-[0.28em]" aria-hidden="true">
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="inline-flex">
            {word.split('').map((char, charIndex) => (
              <span key={charIndex} className="char inline-block">
                {char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
