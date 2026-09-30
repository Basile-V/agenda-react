import { expect, test, type Locator, type Page } from '@playwright/test';

// What jsdom cannot tell: where the browser really puts the events, once the CSS grid, the
// real ResizeObserver and the layout function work together.
//
// Mock backend seed for today, as seen by Basile (src/test/db.ts): #1 09:30 30min and
// #2 09:45 60min overlap, #3 12:30 60min is alone, #4 14:00 90min is a public event of admin.

async function login(page: Page) {
  await page.goto('/');
  const panel = page.getByRole('tabpanel', { name: 'Connexion' });
  await panel.getByLabel("Nom d'utilisateur").fill('basile');
  await panel.getByLabel('Mot de passe').fill('demo1234');
  await panel.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.locator('#event-1')).toBeVisible();
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('element is not rendered');
  return bounds;
}

/** The three kata rules, measured on the rendered page. LargeurMax is the events area. */
async function expectKataRules(page: Page) {
  const area = await box(page.locator('#event-1').locator('..'));
  const a = await box(page.locator('#event-1'));
  const b = await box(page.locator('#event-2'));
  const alone = await box(page.locator('#event-3'));

  // Rule 1: overlapping events have the same width.
  expect(a.width).toBeCloseTo(b.width, 1);
  // Rule 3: together, they fill LargeurMax.
  expect(a.width + b.width).toBeCloseTo(area.width, 1);
  // Rule 2: LargeurMax is the container width, and nothing goes beyond it.
  expect(alone.width).toBeCloseTo(area.width, 1);
  expect(a.x).toBeCloseTo(area.x, 1);
  expect(b.x + b.width).toBeCloseTo(area.x + area.width, 1);
  // Side by side: they never cover each other.
  expect(b.x).toBeCloseTo(a.x + a.width, 1);
  return area;
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`kata rules hold on a ${viewport.width}px wide window`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page);
    await expectKataRules(page);

    // Nothing overflows the window either.
    const scrollWidth = await page.evaluate('document.documentElement.scrollWidth');
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  });
}

test('the layout follows the window when it is resized', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  const wide = await expectKataRules(page);

  await page.setViewportSize({ width: 700, height: 800 });
  await expect
    .poll(async () => (await box(page.locator('#event-3'))).width)
    .toBeLessThan(wide.width);
  const narrow = await expectKataRules(page);
  expect(narrow.width).toBeLessThan(wide.width);
});

test('an event sits at its time, with a height proportional to its duration', async ({ page }) => {
  await login(page);
  const area = await box(page.locator('#event-1').locator('..'));
  const lunch = await box(page.locator('#event-3'));
  // 09:00 → 21:00 is 12 hours: 12:30 starts 3.5 hours down, one hour is a twelfth of the grid.
  // (±2px: the area's bottom border and sub-pixel rounding.)
  const hour = area.height / 12;
  expect(Math.abs(lunch.y - (area.y + 3.5 * hour))).toBeLessThan(2);
  expect(Math.abs(lunch.height - hour)).toBeLessThan(2);
});

test('creates an event, then deletes it', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Nouvel événement' }).click();
  const form = page.getByRole('dialog', { name: 'Nouvel événement' });
  await form.getByLabel('Titre').fill('Atelier');
  await form.getByLabel('Heure de début').fill('15:00');
  await form.getByRole('button', { name: 'Ajouter' }).click();

  // Kata: a div whose id attribute and content both carry the event id.
  const created = page.locator('#event-6');
  await expect(created).toContainText('#6 Atelier');
  await expect(created).toHaveJSProperty('tagName', 'DIV');

  await created.click();
  await page
    .getByRole('dialog', { name: 'Atelier' })
    .getByRole('button', { name: 'Supprimer' })
    .click();
  await expect(created).toHaveCount(0);
});
