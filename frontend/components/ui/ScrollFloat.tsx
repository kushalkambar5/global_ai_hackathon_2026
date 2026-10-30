"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollFloat.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollFloatProps {
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null> | null;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
  scrub?: boolean | number;
  as?: React.ElementType;
}

export default function ScrollFloat({
  children,
  scrollContainerRef,
  containerClassName = '',
  textClassName = '',
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'top 90%',
  scrollEnd = 'top 40%',
  stagger = 0.03,
  scrub = 0.8,
  as = 'h2',
}: ScrollFloatProps) {
  const Component = as as any;
  const containerRef = useRef<HTMLHeadingElement>(null);

  const splitText = useMemo(() => {
    let charIndex = 0;

    const renderSplit = (node: React.ReactNode): React.ReactNode => {
      if (typeof node === 'string' || typeof node === 'number') {
        const text = String(node);
        const words = text.split(' ');
        return words.map((word, wIdx) => {
          return (
            <span
              key={wIdx}
              className="word"
              style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
            >
              {word.split('').map((char) => {
                const key = charIndex++;
                return (
                  <span className="char" key={key} style={{ display: 'inline-block' }}>
                    {char}
                  </span>
                );
              })}
              {wIdx < words.length - 1 && (
                <span className="char" key={charIndex++} style={{ display: 'inline-block' }}>
                  {'\u00A0'}
                </span>
              )}
            </span>
          );
        });
      }
      if (Array.isArray(node)) {
        return node.map((child, idx) => (
          <React.Fragment key={idx}>{renderSplit(child)}</React.Fragment>
        ));
      }
      if (React.isValidElement(node)) {
        const childrenProp = (node.props as { children?: React.ReactNode }).children;
        return React.cloneElement(
          node as React.ReactElement<{ children?: React.ReactNode }>,
          {
            children: renderSplit(childrenProp),
          }
        );
      }
      return node;
    };

    return renderSplit(children);
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;

    const charElements = el.querySelectorAll('.char');

    if (charElements.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        charElements,
        {
          willChange: 'opacity, transform',
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: '50% 0%',
        },
        {
          duration: animationDuration,
          ease: ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: stagger,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: scrollStart,
            end: scrollEnd,
            scrub: scrub,
            invalidateOnRefresh: true,
          },
        }
      );
    }, el);

    const timer1 = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    const timer2 = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      ctx.revert();
    };
  }, [
    scrollContainerRef,
    animationDuration,
    ease,
    scrollStart,
    scrollEnd,
    stagger,
    scrub,
  ]);

  return (
    <Component ref={containerRef} className={`scroll-float ${containerClassName}`}>
      <span className={`scroll-float-text ${textClassName}`}>{splitText}</span>
    </Component>
  );
}

