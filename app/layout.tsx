import type { Metadata } from 'next'
import { DM_Serif_Display, Hanken_Grotesk } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-hanken',
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
    <html lang="fr" className={`${dmSerif.variable} ${hanken.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
