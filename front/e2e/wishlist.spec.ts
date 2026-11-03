import { expect, test } from './fixtures'

test.describe('Wishlist', () => {
  test('affiche le Pokédex et une wishlist vide', async ({ page, app }) => {
    await app.goto()

    await expect(page.getByRole('heading', { name: 'PokéWish' })).toBeVisible()
    await expect(page.getByText('Ta wishlist est vide.')).toBeVisible()
    await expect(page.getByText('Ma wishlist · 0/6')).toBeVisible()
  })

  test('recherche en français, sans accents ni majuscules', async ({ app }) => {
    await app.goto()

    await app.search.fill('sala')
    await expect(app.results.getByRole('listitem')).toHaveCount(2)
    await expect(app.tile('Salamèche')).toBeVisible()
    await expect(app.tile('Salarsen')).toBeVisible()

    await app.search.fill('EVOLI')
    await expect(app.tile('Évoli')).toBeVisible()

    await app.search.fill('25')
    await expect(app.results.getByRole('listitem')).toHaveCount(1)
    await expect(app.tile('Pikachu')).toBeVisible()

    await app.search.fill('zzz')
    await expect(app.results).toBeHidden()
  })

  test("ajoute un Pokémon : affiché, enregistré dans l'API, toujours là après rechargement", async ({
    page,
    app,
    api,
  }) => {
    await app.goto()

    await app.add('salameche', 'Salamèche')
    await expect(app.search).toHaveValue('')
    await expect(page.getByText('Ma wishlist · 1/6')).toBeVisible()
    expect(await api.list()).toEqual([
      { id: 4, name: 'Salamèche', caught: false },
    ])

    await page.reload()
    await expect(app.card('Salamèche')).toBeVisible()
  })

  test('un Pokémon déjà présent ne peut pas être ajouté deux fois', async ({
    app,
    api,
  }) => {
    await api.seed(['Pikachu'])
    await app.goto()

    await app.search.fill('pika')
    await expect(app.tile('Pikachu')).toBeDisabled()
    await expect(app.tile('Pikachu')).toContainText('Ajouté ✓')
  })

  test('marque un Pokémon capturé, puis de nouveau à capturer', async ({
    page,
    app,
    api,
  }) => {
    await api.seed(['Évoli'])
    await app.goto()
    const catchButton = app.card('Évoli').getByRole('button', {
      name: /capturer|capturé/i,
    })

    await catchButton.click()
    await expect(catchButton).toHaveAttribute('aria-pressed', 'true')
    await expect(catchButton).toHaveText('Capturé')
    await expect(page.getByText('1 / 1 capturés')).toBeVisible()
    expect((await api.list())[0]?.caught).toBe(true)

    await catchButton.click()
    await expect(catchButton).toHaveText('À capturer')
    expect((await api.list())[0]?.caught).toBe(false)
  })

  test('retire un Pokémon', async ({ page, app, api }) => {
    await api.seed(['Carapuce', 'Mewtwo'])
    await app.goto()

    await app
      .card('Carapuce')
      .getByRole('button', { name: 'Retirer Carapuce' })
      .click()

    await expect(app.card('Carapuce')).toBeHidden()
    await expect(app.card('Mewtwo')).toBeVisible()
    expect((await api.list()).map((p) => p.name)).toEqual(['Mewtwo'])

    await app
      .card('Mewtwo')
      .getByRole('button', { name: 'Retirer Mewtwo' })
      .click()
    await expect(page.getByText('Ta wishlist est vide.')).toBeVisible()
  })

  test('règle des 6 : liste pleine, ajout bloqué', async ({
    page,
    app,
    api,
  }) => {
    await api.seed([
      'Bulbizarre',
      'Salamèche',
      'Carapuce',
      'Pikachu',
      'Évoli',
      'Ectoplasma',
    ])
    await app.goto()

    await expect(page.getByText('Ma wishlist · 6/6')).toBeVisible()
    await expect(page.getByText(/Wishlist pleine \(6\/6\)/)).toBeVisible()

    await app.search.fill('mewtwo')
    await expect(app.tile('Mewtwo')).toBeDisabled()
    await expect(app.tile('Mewtwo')).toContainText('Liste pleine')
  })
})
