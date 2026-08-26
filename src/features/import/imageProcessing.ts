// Skalerer og komprimerer billeder, så en enhed kan rumme flere hundrede af
// dem, samt to små hjælpefunktioner til at åbne filvælgeren (én eller flere
// filer ad gangen). Bruges både af bulk-import og af "tilføj/skift billede"
// på et enkelt piktogram.

const MAKS_LAENGDE_PX = 500
const JPEG_KVALITET = 0.8

/**
 * Skalerer billedet ned til maks 500 px på den længste led og komprimerer
 * det til JPEG. JPEG er valgt frem for WebP, fordi Safari på iPhone/iPad
 * (endnu) ikke kan kode WebP via canvas - kun vise det.
 */
export async function skalerOgKomprimerBillede(fil: File): Promise<Blob> {
  const billede = await createImageBitmap(fil, { imageOrientation: 'from-image' })

  const skala = Math.min(1, MAKS_LAENGDE_PX / Math.max(billede.width, billede.height))
  const bredde = Math.max(1, Math.round(billede.width * skala))
  const hoejde = Math.max(1, Math.round(billede.height * skala))

  const canvas = document.createElement('canvas')
  canvas.width = bredde
  canvas.height = hoejde
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kunne ikke behandle billedet - canvas er ikke understøttet.')
  ctx.drawImage(billede, 0, 0, bredde, hoejde)
  billede.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kunne ikke gemme billedet.'))),
      'image/jpeg',
      JPEG_KVALITET,
    )
  })
}

/** Åbner systemets filvælger til ét billede. Returnerer null hvis fortrudt. */
export function vaelgEnkeltBillede(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Åbner systemets filvælger til flere billeder på én gang. */
export function vaelgFlereBilleder(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => resolve(input.files ? Array.from(input.files) : [])
    input.oncancel = () => resolve([])
    input.click()
  })
}
