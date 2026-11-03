import { expect, test } from './fixtures'

// Parcours complets, du navigateur jusqu'à l'API : chaque étape est vérifiée
// à l'écran PUIS dans l'API (fixture `api`), sans rien simuler côté API.
test.describe('Parcours complets', () => {
  test('recherche -> wishlist -> fiche -> like -> langue -> rechargement', async ({
    page,
    app,
    api,
  }) => {
    const likesBefore = await api.likes(25)

    // 1. Recherche et ajout (français)
    await app.goto()
    await app.add('pika', 'Pikachu')
    expect(await api.list()).toEqual([
      { id: 25, name: 'Pikachu', caught: false },
    ])

    // 2. Depuis la wishlist, la fiche
    await app.card('Pikachu').getByRole('link', { name: 'Pikachu' }).click()
    await expect(page).toHaveURL('/fr/pokemon/25')
    await expect(page.getByText('Pokémon Souris')).toBeVisible()

    // 3. Like
    const like = page.getByRole('button', { name: /like/i })
    await like.click()
    await expect(like).toHaveAttribute('aria-pressed', 'true')
    expect(await api.likes(25)).toBe(likesBefore + 1)

    // 4. Changement de langue : même fiche, en allemand, like conservé
    await page.getByRole('link', { name: 'DE', exact: true }).click()
    await expect(page).toHaveURL('/de/pokemon/25')
    await expect(page.getByText('Maus-Pokémon')).toBeVisible()
    await expect(like).toHaveAccessibleName('Like für Pikachu entfernen')
    await expect(like).toContainText(String(likesBefore + 1))

    // 5. Rechargement : tout vient de l'API (et du navigateur pour « j'ai liké »)
    await page.reload()
    await expect(like).toHaveAttribute('aria-pressed', 'true')
    await expect(like).toContainText(String(likesBefore + 1))

    // 6. Retour au Pokédex : la wishlist est toujours là, en allemand
    await page.getByRole('link', { name: '← Pokédex' }).click()
    await expect(page).toHaveURL('/de')
    const wishlist = page.getByRole('list', { name: 'Meine Wunschliste' })
    await expect(wishlist.getByRole('listitem')).toHaveCount(1)
    await expect(wishlist.getByRole('link', { name: 'Pikachu' })).toBeVisible()
  })

  test('persistance : capturé + retiré, survit au rechargement et à un nouvel onglet', async ({
    page,
    context,
    app,
    api,
  }) => {
    await api.seed(['Salamèche', 'Carapuce'])
    await app.goto()

    // Capturé, puis rechargement
    const catchButton = app.card('Salamèche').getByRole('button', {
      name: /capturer|capturé/i,
    })
    await catchButton.click()
    await expect(catchButton).toHaveText('Capturé')
    await page.reload()
    await expect(
      app.card('Salamèche').getByRole('button', { name: 'Capturé' }),
    ).toBeVisible()

    // Retrait dans un AUTRE onglet : le premier le voit après rechargement
    const other = await context.newPage()
    await other.goto('/fr')
    await other.getByRole('button', { name: 'Retirer Carapuce' }).click()
    await expect(
      other.getByRole('button', { name: 'Retirer Carapuce' }),
    ).toBeHidden()

    await page.reload()
    await expect(app.card('Carapuce')).toBeHidden()
    expect(await api.list()).toEqual([
      { id: 4, name: 'Salamèche', caught: true },
    ])
  })
})
