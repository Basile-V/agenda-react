import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { expect, test } from 'vitest';
import { TextField } from './TextField';

test('the label names the input', () => {
  render(<TextField label="Titre" />);
  expect(screen.getByRole('textbox', { name: 'Titre' })).toBeValid();
});

test('an error marks the input invalid and describes it', () => {
  render(<TextField label="Titre" error="Le titre est requis" />);
  const input = screen.getByRole('textbox', { name: 'Titre' });
  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription('Le titre est requis');
});

test('forwards ref and native props', () => {
  const ref = createRef<HTMLInputElement>();
  render(<TextField label="Durée" ref={ref} type="number" min={1} />);
  expect(ref.current).toBe(screen.getByRole('spinbutton', { name: 'Durée' }));
  expect(ref.current).toHaveAttribute('min', '1');
});
