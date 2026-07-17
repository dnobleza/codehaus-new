import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the CodeHaus landing page by default', async () => {
    render(<App />);
    expect(await screen.findByRole('link', { name: 'CodeHaus' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'One workspace to quote, build, and bill every client project.',
      }),
    ).toBeInTheDocument();
  });
});
