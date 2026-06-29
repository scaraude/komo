import type { Metadata } from 'next'
import { Fredoka, Manrope } from 'next/font/google'
import './globals.css'
import { UndoProvider } from '@/components/ui/undo'

// Charte KOMO : Fredoka pour les titres (rond, amical), Manrope pour le corps.
// Fonts variables → on charge l'axe de poids complet (pas de `weight` figé).
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Komo — organise ton event entre potes',
  description: "Un lien dans le groupe. Tout le monde se déclare en 30 secondes. Qui vient, qui a une caisse, qui n'a pas encore de solution.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${manrope.variable}`}>
      <body className="min-h-screen font-sans">
        <UndoProvider>{children}</UndoProvider>
      </body>
    </html>
  )
}
