import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import StudentPortal from '../pages/StudentPortal';

afterEach(cleanup);
const Destination = () => <p>Requested certificate: {useParams().code}</p>;
test.each(['abc-123', 'https://certiverxia.com/verify/ABC-123', 'https://certiverxia.com/certificate/ABC-123'])('student lookup opens the real verification route for %s', input => {
  render(<MemoryRouter initialEntries={['/student']}><Routes><Route path="/student" element={<StudentPortal />} /><Route path="/verify/:code" element={<Destination />} /></Routes></MemoryRouter>);
  expect(screen.queryByText('Bachelor of Information Technology')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Certificate code or link'), { target: { value: input } });
  fireEvent.click(screen.getByRole('button', { name: 'Find certificate' }));
  expect(screen.getByText('Requested certificate: ABC-123')).toBeInTheDocument();
});
test('invalid lookup stays on the form with a useful error', () => {
  render(<MemoryRouter><StudentPortal /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Certificate code or link'), { target: { value: '<script>' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find certificate' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid certificate code or certificate link.');
});
