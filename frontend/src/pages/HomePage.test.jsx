import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({ api: { health: vi.fn() } }));

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(api.health).mockReset();
  });

  it('shows the backend status once it loads', async () => {
    vi.mocked(api.health).mockResolvedValue({ status: 'UP' });

    render(<HomePage />);

    expect(await screen.findByText('Backend status: UP')).toBeInTheDocument();
  });

  it('shows the error when the backend cannot be reached', async () => {
    vi.mocked(api.health).mockRejectedValue(new Error('Cannot reach the server. Is the backend running?'));

    render(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});
