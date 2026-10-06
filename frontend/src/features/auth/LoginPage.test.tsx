import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeAuth, renderWithProviders } from '../../test/utils';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('shows validation errors and does not submit invalid input', async () => {
    const auth = makeAuth(null);
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', auth });

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('submits credentials and navigates away on success', async () => {
    const auth = makeAuth(null);
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', auth });

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret-pass' }),
    );
    expect(await screen.findByText('navigated away')).toBeInTheDocument();
  });
});
