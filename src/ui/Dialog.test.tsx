import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { Dialog } from './Dialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Ouvrir</button>
      {open && (
        <Dialog title="Titre de la modale" onClose={() => setOpen(false)}>
          <button onClick={() => setOpen(false)}>Fermer</button>
        </Dialog>
      )}
    </>
  );
}

test('opens as a modal named by its title', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
  const dialog = screen.getByRole('dialog', { name: 'Titre de la modale' });
  expect(dialog).toHaveAttribute('open');
});

test('closing it gives the focus back to the opener', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
  await user.click(screen.getByRole('button', { name: 'Fermer' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Ouvrir' })).toHaveFocus();
});

test('a click on the backdrop closes it', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
  await user.click(screen.getByRole('dialog'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Escape closes it', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
  // jsdom does not turn Escape into the dialog's cancel event: dispatch it as the browser would.
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Ouvrir' })).toHaveFocus();
});
