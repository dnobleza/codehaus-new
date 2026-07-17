import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used by
// ScrollReveal on the marketing page) needs one to mount without throwing.
class MockIntersectionObserver {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
  takeRecords = () => [];
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
