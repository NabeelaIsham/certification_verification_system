import { render, screen, fireEvent } from '@testing-library/react';
import VerificationPortal from '../src/pages/VerificationPortal.jsx';
import { MemoryRouter } from 'react-router-dom';

describe('VerificationPortal', () => {
  it('renders verification input and button', () => {
    render(
      <MemoryRouter>
        <VerificationPortal />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /verify certificate/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error when verify clicked with empty code', () => {
    render(
      <MemoryRouter>
        <VerificationPortal />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /verify certificate/i }));
    expect(screen.getByText(/please enter a certificate code/i)).toBeInTheDocument();
  });
});
