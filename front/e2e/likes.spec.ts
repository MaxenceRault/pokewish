import { API_URL } from './env'
import { expect, test } from './fixtures'

// Les likes vivent dans l'API (partagée par toute la suite e2e) : on compare
// toujours à la valeur lue juste avant, jamais à un nombre fixe.
test.describe('Likes', () => {
  const likeButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: /like/i })

  test('liker puis annuler : compteur à l’écran ET dans l’API', async ({
    page,
    api,
  }) => {
    const before = await api.likes(25)
    await page.goto('/fr/pokemon/25')
    const button = likeButton(page)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(button).toHaveAccessibleName('Liker Pikachu')
    await expect(button).toContainText(String(before))

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveAccessibleName('Retirer ton like de Pikachu')
    await expect(button).toContainText(String(before + 1))
    expect(await api.likes(25)).toBe(before + 1)

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(button).toContainText(String(before))
    expect(await api.likes(25)).toBe(before)
  })

  test('affiche les likes des autres visiteurs', async ({ page, api }) => {
    await api.like(25, 3)
    const total = await api.likes(25)

    await page.goto('/pokemon/25')

    await expect(likeButton(page)).toContainText(String(total))
    await expect(likeButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('persistance : après rechargement, le like est toujours là', async ({
    page,
    api,
  }) => {
    const before = await api.likes(25)
    await page.goto('/pokemon/25')
    await likeButton(page).click()
    await expect(likeButton(page)).toContainText(String(before + 1))

    await page.reload()

    // le total vient de l'API, « j'ai liké » du navigateur
    await expect(likeButton(page)).toContainText(String(before + 1))
    await expect(likeButton(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('API injoignable : bouton désactivé, la fiche reste lisible', async ({
    page,
  }) => {
    await page.route(`${API_URL}/likes/**`, (route) =>
      route.abort('connectionrefused'),
    )
    await page.goto('/pokemon/25')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Pikachu' }),
    ).toBeVisible()
    await expect(likeButton(page)).toBeDisabled()
    await expect(likeButton(page)).toContainText('–')
  })
})
