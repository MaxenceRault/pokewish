import { expect, test } from './fixtures'

const TEAM = [
  'Bulbizarre',
  'Salamèche',
  'Carapuce',
  'Pikachu',
  'Évoli',
  'Ectoplasma',
]

test.describe('Langues (en par défaut, fr, es, de)', () => {
  test("l'anglais est la langue par défaut", async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await expect(page.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Name or number…',
    )
    await expect(page.getByText('Your wishlist is empty.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'EN' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('les noms des Pokémon suivent la langue', async ({ page }) => {
    await page.goto('/')
    const search = page.getByRole('searchbox')
    await expect(search).toBeEnabled()

    await search.fill('charm')
    await expect(page.getByRole('button', { name: /Charmander/ })).toBeVisible()

    await page.goto('/de')
    await expect(search).toBeEnabled()
    await search.fill('glum')
    await expect(page.getByRole('button', { name: /Glumanda/ })).toBeVisible()
  })

  test("changer de langue modifie l'interface ET les messages de l'API", async ({
    page,
    api,
  }) => {
    // --- En allemand -------------------------------------------------------
    await page.goto('/de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE')
    await expect(page.getByText('Deine Wunschliste ist leer.')).toBeVisible()
    const search = page.getByRole('searchbox', {
      name: 'Pokémon nach Name oder Nummer suchen',
    })
    await expect(search).toBeEnabled()

    // La liste se remplit côté API : c'est l'API qui refusera l'ajout (409)
    await api.seed(TEAM)
    await search.fill('mewtu')
    await page.getByRole('button', { name: /Mewtu/ }).click()
    await expect(page.getByRole('alert')).toHaveText(
      /Die Wunschliste ist voll \(maximal 6 Pokémon\)\./,
    )

    // --- Retour à l'anglais avec le sélecteur ------------------------------
    await page.getByRole('link', { name: 'EN' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await expect(page.getByText('My wishlist · 6/6')).toBeVisible()
    // noms de la wishlist en anglais (enregistrés en français dans l'API)
    const wishlist = page.getByRole('list', { name: 'My wishlist' })
    await expect(
      wishlist.getByRole('link', { name: 'Charmander' }),
    ).toBeVisible()

    // Pikachu disparaît côté API : la suppression renvoie un 404… en anglais
    await api.remove('Pikachu')
    await page.getByRole('button', { name: 'Remove Pikachu' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      /Pokémon #25 is not in the wishlist\./,
    )
  })

  test('la fiche Pokémon est traduite, et garde sa langue', async ({
    page,
  }) => {
    await page.goto('/de/pokemon/25')

    await expect(page.getByText('Maus-Pokémon')).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Typen' }).getByRole('listitem'),
    ).toHaveText(['Elektro'])
    await expect(
      page
        .getByRole('list', { name: 'Basiswerte' })
        .getByRole('listitem')
        .first(),
    ).toContainText('KP')

    // Changer de langue reste sur la même fiche
    await page.getByRole('link', { name: 'EN' }).click()
    await expect(page).toHaveURL('/pokemon/25')
    await expect(page.getByText('Mouse Pokémon')).toBeVisible()
    await expect(
      page.getByText('It stores electricity in its cheeks.'),
    ).toBeVisible()
  })
})
