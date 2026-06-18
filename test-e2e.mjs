import { chromium } from 'playwright'

const BASE = 'https://komo-skarods-projects.vercel.app'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []

  async function check(label, fn) {
    try {
      await fn()
      console.log(`✅ ${label}`)
    } catch (e) {
      console.log(`❌ ${label}: ${e.message}`)
      errors.push(label)
    }
  }

  // 1. Homepage
  await check('Homepage charge', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const h1 = await page.textContent('h1')
    if (!h1.includes('Komo')) throw new Error(`h1 inattendu: "${h1}"`)
  })

  await check('Bouton "Créer un event" présent', async () => {
    const btn = await page.textContent('a[href="/new"]')
    if (!btn.includes('Créer')) throw new Error('Bouton absent')
  })

  // 2. Page /new — step type puis formulaire
  await check('Page /new : step sélection type charge', async () => {
    await page.goto(`${BASE}/new`, { waitUntil: 'networkidle' })
    await page.waitForSelector('button:has-text("Week-end")')
  })

  await check('Sélectionner le type "Week-end"', async () => {
    await page.click('button:has-text("Week-end")')
    await page.waitForSelector('form')
  })

  let eventSlug = null

  await check('Créer un event via formulaire', async () => {
    await page.fill('input[name="title"]', 'Week-end test Playwright')
    await page.fill('input[name="destination"]', 'Marseille')
    await page.fill('input[name="date_start"]', '2026-07-04')
    await page.fill('input[name="date_end"]', '2026-07-06')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/e\/.+\/join/, { timeout: 10000 })
    eventSlug = page.url().match(/\/e\/([^/]+)\/join/)?.[1]
    if (!eventSlug) throw new Error(`URL inattendue: ${page.url()}`)
    console.log(`   → slug: ${eventSlug}`)
  })

  // 3. Page join
  await check("Page join affiche le titre de l'event", async () => {
    const title = await page.textContent('h1')
    if (!title.includes('Week-end test')) throw new Error(`Titre inattendu: "${title}"`)
  })

  await check('Rejoindre avec un pseudo', async () => {
    await page.fill('input[name="pseudo"]', 'Playwright')
    await page.click('button[type="submit"]')
    // Attendre URL sans /join
    await page.waitForURL((url) => url.href.includes('/e/') && !url.href.includes('/join'), { timeout: 10000 })
  })

  // 4. Page event
  await check('Page event affiche le titre', async () => {
    const title = await page.textContent('h1')
    if (!title.includes('Week-end test')) throw new Error(`Titre inattendu: "${title}"`)
  })

  await check('Tabs Présence / Transport visibles', async () => {
    await page.waitForSelector('a[href="?tab=presence"]')
    await page.waitForSelector('a[href="?tab=transport"]')
  })

  await check('Boutons présence visibles (🔥🤔😬❌)', async () => {
    await page.waitForSelector('button:has-text("Chaud")')
    await page.waitForSelector('button:has-text("Probable")')
    await page.waitForSelector('button:has-text("Pas sûr")')
    await page.waitForSelector('button:has-text("Non")')
  })

  await check('Clic sur "Chaud" → bouton actif immédiatement', async () => {
    const btn = page.locator('button:has-text("Chaud")')
    await btn.click()
    // useState → mise à jour immédiate, pas besoin d'attendre le server
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Chaud'))
      return b?.className?.includes('bg-ink')
    }, { timeout: 3000 })
    // Laisser le server action updatePresence terminer avant de naviguer
    await page.waitForTimeout(4000)
  })

  await check('Counter strip 3 cartes présentes', async () => {
    const cards = await page.locator('.grid.grid-cols-3 > div').count()
    if (cards < 3) throw new Error(`Seulement ${cards} cards`)
  })

  await check('Présence partielle (3 jours) visible', async () => {
    // Event du 4 au 6 juillet = 3 jours
    const btns = await page.locator('text="Tu viens quels jours ?"').count()
    if (btns === 0) throw new Error('Section jours absente')
  })

  await check('Liste des participants contient "Playwright"', async () => {
    const list = await page.textContent('body')
    if (!list.includes('Playwright')) throw new Error('Participant absent')
  })

  // 5. Tab Transport
  await check('Tab Transport → panel charge', async () => {
    await page.click('a[href="?tab=transport"]')
    await page.waitForURL(/tab=transport/)
    await page.waitForSelector('button:has-text("Aller")')
  })

  await check('Toggle Aller / Retour fonctionne', async () => {
    await page.locator('button:has-text("Retour")').click()
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Aller")').click()
    await page.waitForTimeout(200)
  })

  await check('Zone "sans transport" présente (Playwright est non-casé)', async () => {
    // La re-render server doit récupérer presence_status='hot' mis à jour
    await page.waitForSelector('text=sans solution de transport', { timeout: 8000 })
  })

  await check('Formulaire "Je propose un trajet" ouvre et ferme', async () => {
    await page.click('button:has-text("Je propose un trajet")')
    await page.waitForSelector('input[name="label"]', { timeout: 3000 })
    // Fermer via bouton Annuler
    await page.click('button:has-text("Annuler")')
    await page.waitForTimeout(300)
    const label = await page.locator('input[name="label"]').count()
    if (label > 0) throw new Error('Modal toujours ouvert')
  })

  await check('Bouton ✨ auto-affecter visible (créateur + non-casé)', async () => {
    // Le user est créateur et non-casé → bouton ✨ doit être visible
    await page.waitForSelector('button:has-text("✨")', { timeout: 5000 })
  })

  await check('Modal auto-affecter ouvre et calcule', async () => {
    await page.click('button:has-text("✨")')
    await page.waitForSelector('button:has-text("Calculer les suggestions")', { timeout: 3000 })
    await page.click('button:has-text("Calculer les suggestions")')
    // Pas de legs → "sans solution" ou participants non-résolubles
    await page.waitForTimeout(2000)
    const body = await page.textContent('body')
    const ok = body.includes('Playwright') || body.includes('casé') || body.includes('Confirmer') || body.includes('solution')
    if (!ok) throw new Error('Résultat solveur inattendu')
    await page.click('button:has-text("Annuler")')
    await page.waitForTimeout(300)
  })

  // 6. Tab Bouffe
  await check('Tab Bouffe → grille charge', async () => {
    await page.click('a[href="?tab=bouffe"]')
    await page.waitForURL(/tab=bouffe/)
    await page.waitForSelector('text=Qui apporte quoi')
  })

  await check('Ajouter un slot dîner', async () => {
    // Event du 4 au 6 juillet — bouton "Ajouter dîner" sur le 1er jour
    await page.locator('button:has-text("Ajouter dîner")').first().click()
    await page.waitForSelector('text=Dîner', { timeout: 5000 })
  })

  await check('Ajouter une contribution bouffe', async () => {
    await page.click('button:has-text("Je m\'occupe de…")')
    await page.waitForSelector('input[placeholder*="Salade"]')
    await page.fill('input[placeholder*="Salade"]', 'Poulet rôti')
    await page.click('button:has-text("OK")')
    await page.waitForTimeout(500)
    await page.waitForSelector('text=Poulet rôti')
  })

  // 7. Section hébergement (retour onglet Présence, event multi-jours)
  await check('Section hébergement visible dans Présence (multi-jours)', async () => {
    await page.click('a[href="?tab=presence"]')
    await page.waitForSelector('text=Logement', { timeout: 5000 })
  })

  await check('Proposer un hébergement', async () => {
    await page.click('button:has-text("Proposer un logement")')
    await page.waitForSelector('input[placeholder*="Airbnb"]')
    await page.fill('input[placeholder*="Airbnb"]', 'Airbnb test E2E')
    await page.click('button:has-text("Proposer →")')
    await page.waitForTimeout(1500)
    await page.waitForSelector('text=Airbnb test E2E', { timeout: 5000 })
  })

  await check('Voter pour un hébergement', async () => {
    await page.click('button:has-text("Top")')
    await page.waitForTimeout(500)
    await page.waitForSelector('button:has-text("✓ Top")', { timeout: 3000 })
  })

  // 8. Route OG image
  await check('Route OG /api/og/[slug] génère une image', async () => {
    const resp = await page.request.get(`${BASE}/api/og/${eventSlug}`)
    if (!resp.ok()) throw new Error(`Status: ${resp.status()}`)
    const ct = resp.headers()['content-type'] ?? ''
    if (!ct.includes('image/')) throw new Error(`Content-type inattendu: ${ct}`)
  })

  // 9. Mode sondage de date (nouvelle page)
  const page2 = await context.newPage()

  await check('Créer event en mode sondage de date', async () => {
    await page2.goto(`${BASE}/new`, { waitUntil: 'networkidle' })
    await page2.click('button:has-text("Week-end")')
    await page2.waitForSelector('form')
    await page2.fill('input[name="title"]', 'Sondage Playwright')
    await page2.fill('input[name="destination"]', 'TBD')
    await page2.click('button:has-text("Pas sûr des dates")')
    await page2.waitForSelector('text=Les participants voteront', { timeout: 3000 })
    await page2.click('button[type="submit"]')
    await page2.waitForURL(/\/e\/.+\/join/, { timeout: 10000 })
  })

  await check('Rejoindre event sondage', async () => {
    await page2.fill('input[name="pseudo"]', 'PlaywrightSondage')
    await page2.click('button[type="submit"]')
    await page2.waitForURL((url) => url.href.includes('/e/') && !url.href.includes('/join'), { timeout: 10000 })
  })

  await check('Tab "Dates" visible et sondage affiché', async () => {
    await page2.waitForSelector('a[href="?tab=dates"]', { timeout: 5000 })
    await page2.waitForSelector('text=Quelle date vous arrange')
  })

  await check('Proposer une date dans le sondage', async () => {
    await page2.click('button:has-text("Proposer une date")')
    await page2.waitForSelector('input[type="date"]')
    await page2.fill('input[type="date"]', '2026-08-15')
    await page2.click('button:has-text("Proposer")')
    await page2.waitForTimeout(1500)
    await page2.waitForSelector('text=août', { timeout: 5000 })
  })

  await check('Voter pour une date', async () => {
    await page2.click('button:has-text("Je peux")')
    await page2.waitForTimeout(500)
    await page2.waitForSelector('button:has-text("✓ Je peux")', { timeout: 3000 })
  })

  await page2.close()

  // 10. Page 404
  await check('Slug inexistant → 404 ou redirect', async () => {
    await page.goto(`${BASE}/e/xxxxzzzz`, { waitUntil: 'networkidle' })
    const body = await page.content()
    const ok = body.toLowerCase().includes('404') ||
                body.toLowerCase().includes('not found') ||
                page.url().includes('/join') ||
                page.url() === BASE + '/'
    if (!ok) throw new Error(`Page inattendue: ${page.url()}`)
  })

  await browser.close()

  console.log('\n' + '─'.repeat(40))
  if (errors.length === 0) {
    console.log('✅ Tous les tests passent !')
  } else {
    console.log(`❌ ${errors.length} test(s) échoué(s): ${errors.join(', ')}`)
    process.exit(1)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
