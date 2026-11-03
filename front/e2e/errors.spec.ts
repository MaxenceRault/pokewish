import { API_URL } from './env'
import { expect, test } from './fixtures'

test.describe('Erreurs', () => {
  test('API injoignable : message, puis « Réessayer » recharge la liste', async ({
    page,
    app,
    api,
  }) => {
    // Toutes les requêtes vers l'API échouent, comme si elle était éteinte
    await page.route(`${API_URL}/**`, (route) =>
      route.abort('connectionrefused'),
    )
    await page.goto('/fr')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText("L'API PokéWish est injoignable")
    await expect(
      page.getByText("Impossible de charger la wishlist depuis l'API."),
    ).toBeVisible()

    // L'API revient, avec un Pokémon enregistré entre-temps
    await api.seed(['Pikachu'])
    await page.unroute(`${API_URL}/**`)
    await alert.getByRole('button', { name: 'Réessayer' }).click()

    await expect(alert).toBeHidden()
    await expect(app.card('Pikachu')).toBeVisible()
  })

  test("refus de l'API affiché : liste remplie par ailleurs (409)", async ({
    page,
    app,
    api,
  }) => {
    await app.goto()
    // Pendant que la page est ouverte, la wishlist se remplit côté API
    await api.seed([
      'Bulbizarre',
      'Salamèche',
      'Carapuce',
      'Pikachu',
      'Évoli',
      'Ectoplasma',
    ])

    // La page croit encore la liste vide : c'est l'API qui refuse
    await app.search.fill('mewtwo')
    await app.tile('Mewtwo').click()

    await expect(page.getByRole('alert')).toContainText(
      'La wishlist est pleine (6 Pokémon maximum).',
    )
    expect(await api.list()).toHaveLength(6)
  })

  test('PokéAPI injoignable : la recherche affiche « Hors ligne »', async ({
    page,
    app,
  }) => {
    // Ces routes passent avant celles des fixtures (les plus récentes gagnent)
    await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
      route.fulfill({ status: 503 }),
    )
    await page.route('https://pokeapi.co/**', (route) =>
      route.fulfill({ status: 503 }),
    )
    await app.goto()

    await expect(
      page.getByText('PokéAPI est injoignable pour le moment.'),
    ).toBeVisible()
    await expect(page.getByText('Hors ligne')).toBeVisible()
    // La wishlist, elle, fonctionne toujours (elle vient de notre API)
    await expect(page.getByText('Ta wishlist est vide.')).toBeVisible()
  })
})
