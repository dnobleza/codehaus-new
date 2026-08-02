import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the CodeHaus landing page by default', async () => {
    render(<App />);
    /*
      Explicit 10s timeout rather than the 1s default. The landing route is
      lazy-loaded, and its chunk now imports two multi-megabyte PNGs
      (`hero-pilandok.png` ~2.4MB, `navbar.png` ~2.0MB). Vite transforms those
      on first request here, which reliably pushes the chunk past the default
      wait and made this fail with an empty body -- the route had simply not
      resolved yet, not rendered wrong.

      This is a symptom, not the problem: those assets are far larger than they
      need to be for the sizes they render at. Once they are re-exported
      (targets: hero <=200KB WebP, logo <=20KB), drop this timeout back to the
      default -- if it still passes, the weight is genuinely gone.
    */
    expect(
      await screen.findByRole('link', { name: 'CodeHaus' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'One workspace to quote, build, and bill every client project.',
      }),
    ).toBeInTheDocument();
  });
});
