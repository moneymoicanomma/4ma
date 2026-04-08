"use client";

import { useEffect } from "react";

function clearRailActiveState(items: readonly HTMLElement[]) {
  for (const item of items) {
    delete item.dataset.railActive;
  }
}

function syncRailActiveState(rail: HTMLElement) {
  const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-item]"));

  if (!items.length) {
    return;
  }

  const hasOverflow = rail.scrollWidth - rail.clientWidth > 24;

  if (window.innerWidth > 780 || !hasOverflow) {
    clearRailActiveState(items);
    return;
  }

  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;
  let bestItem = items[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    const visibleWidth =
      Math.max(0, Math.min(rect.right, railRect.right) - Math.max(rect.left, railRect.left)) /
      Math.max(rect.width, 1);
    const centerDistance = Math.abs(rect.left + rect.width / 2 - railCenter);
    const score = visibleWidth * 1000 - centerDistance;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  for (const item of items) {
    item.dataset.railActive = item === bestItem ? "true" : "false";
  }
}

export function LandingMotionController() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const railNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"));
    const cleanups: Array<() => void> = [];

    if (railNodes.length) {
      let frame = 0;

      const requestRailSync = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          for (const rail of railNodes) {
            syncRailActiveState(rail);
          }
        });
      };

      requestRailSync();

      for (const rail of railNodes) {
        rail.addEventListener("scroll", requestRailSync, { passive: true });
      }

      window.addEventListener("resize", requestRailSync);

      cleanups.push(() => {
        window.cancelAnimationFrame(frame);
        for (const rail of railNodes) {
          rail.removeEventListener("scroll", requestRailSync);
        }
        window.removeEventListener("resize", requestRailSync);
      });
    }

    if (reduceMotion.matches) {
      for (const node of revealNodes) {
        node.classList.add("is-visible");
      }

      return () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
      };
    }

    const root = document.documentElement;
    const initiallyVisible = new Set<HTMLElement>();

    for (const node of revealNodes) {
      if (node.getBoundingClientRect().top <= window.innerHeight * 0.92) {
        node.classList.add("is-visible");
        initiallyVisible.add(node);
      }
    }

    root.dataset.motion = "enabled";

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    for (const node of revealNodes) {
      if (initiallyVisible.has(node)) {
        continue;
      }

      revealObserver.observe(node);
    }

    return () => {
      revealObserver.disconnect();
      delete root.dataset.motion;

      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, []);

  return null;
}
