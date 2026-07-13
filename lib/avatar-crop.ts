// Recadrage avatar côté client (avant upload) : dessine la zone sélectionnée
// dans un canvas de taille fixe et l'exporte en JPEG compressé. Garantit un
// upload léger quel que soit le poids de la photo d'origine (cf. limite de
// 5 Mo des Server Actions) — un besoin de rognage confié à `react-easy-crop`
// pour la partie interaction (drag/pinch), pas réinventé ici.

export type CropAreaPixels = { x: number; y: number; width: number; height: number }

const OUTPUT_SIZE = 640 // px — largement suffisant pour un avatar
const JPEG_QUALITY = 0.85

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Image invalide.')))
    image.src = src
  })
}

export async function cropToBlob(imageSrc: string, crop: CropAreaPixels): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Recadrage non supporté sur ce navigateur.')

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export impossible.'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
