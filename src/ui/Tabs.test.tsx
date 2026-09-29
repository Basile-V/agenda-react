import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Tabs } from './Tabs';

function renderTabs() {
  render(
    <Tabs
      label="Sections"
      tabs={[
        { id: 'a', label: 'Alpha', panel: <input aria-label="Champ alpha" /> },
        { id: 'b', label: 'Bêta', panel: <p>Contenu bêta</p> },
        { id: 'c', label: 'Gamma', panel: <p>Contenu gamma</p> },
      ]}
    />,
  );
  return userEvent.setup();
}

test('exposes a labelled tab list with the first tab selected', () => {
  renderTabs();
  expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Alpha' })).toBeVisible();
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
});

test('selects a tab on click', async () => {
  const user = renderTabs();
  await user.click(screen.getByRole('tab', { name: 'Bêta' }));
  expect(screen.getByRole('tab', { name: 'Bêta' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Bêta' })).toHaveTextContent('Contenu bêta');
});

test('only the selected tab is in the tab sequence', async () => {
  const user = renderTabs();
  await user.tab();
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('textbox', { name: 'Champ alpha' })).toHaveFocus();
});

test('arrows, Home and End move the focus and the selection, wrapping around', async () => {
  const user = renderTabs();
  await user.click(screen.getByRole('tab', { name: 'Alpha' }));

  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Bêta' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Bêta' })).toHaveAttribute('aria-selected', 'true');

  await user.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus();

  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus();

  await user.keyboard('{ArrowLeft}');
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');

  await user.keyboard('{Home}');
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
});

test('switching tabs keeps what was typed', async () => {
  const user = renderTabs();
  await user.type(screen.getByRole('textbox', { name: 'Champ alpha' }), 'bonjour');
  await user.click(screen.getByRole('tab', { name: 'Bêta' }));
  await user.click(screen.getByRole('tab', { name: 'Alpha' }));
  expect(screen.getByRole('textbox', { name: 'Champ alpha' })).toHaveValue('bonjour');
});
