/**
 * URL de recherche Google Maps pour un lieu décrit en texte libre.
 * On ne stocke aucune coordonnée : Google résout la requête textuelle
 * (« Chamonix », « 12 rue de Rivoli, Paris »…). Marche partout, sans clé API.
 */
export function googleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
