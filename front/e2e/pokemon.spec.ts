import { expect, test } from './fixtures'

test.describe('Fiche /pokemon/[name]', () => {
  test('une URL directe affiche le Pokémon et ses informations', async ({
    page,
  }) => {
    await page.goto('/pokemon/25')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
    await expect(page).toHaveTitle('Pikachu · PokéWish')
    await expect(page.getByText('#0025')).toBeVisible()
    await expect(page.getByText('Pokémon Souris')).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Types' }).getByRole('listitem'),
    ).toHaveText(['Électrik'])
    await expect(page.getByText('0,4 m')).toBeVisible()
    await expect(page.getByText('6 kg')).toBeVisible()
    await expect(
      page.getByText('Il stocke de l’électricité dans ses joues.'),
    ).toBeVisible()

    const stats = page.getByRole('list', { name: 'Statistiques de base' })
    await expect(stats.getByRole('listitem')).toHaveCount(3)
    await expect(stats.getByRole('listitem').first()).toContainText('PV')
    await expect(stats.getByRole('listitem').first()).toContainText('35')
    await expect(page.getByText('Total 180')).toBeVisible()
  })

  test('marche aussi avec le nom anglais', async ({ page }) => {
    await page.goto('/pokemon/pikachu')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
  })

  test('404 : Pokémon introuvable, avec un lien de retour', async ({
    page,
  }) => {
    await page.goto('/pokemon/missingno')

    await expect(
      page.getByRole('heading', { name: 'Pokémon introuvable' }),
    ).toBeVisible()
    await expect(page.getByText('« missingno »')).toBeVisible()
    await expect(page).toHaveTitle('Pokémon introuvable · PokéWish')

    await page.getByRole('link', { name: 'Retour au Pokédex' }).click()
    await expect(page).toHaveURL('/')
  })

  test('depuis la wishlist, le nom mène à la fiche', async ({
    page,
    app,
    api,
  }) => {
    await api.seed(['Pikachu'])
    await app.goto()

    await app.card('Pikachu').getByRole('link', { name: 'Pikachu' }).click()

    await expect(page).toHaveURL('/pokemon/25')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
  })
})
