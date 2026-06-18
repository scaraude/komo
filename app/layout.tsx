import type { Metadata } from 'next'
import { Fraunces, Archivo } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
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
    <html lang="fr" className={`${fraunces.variable} ${archivo.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
