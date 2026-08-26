// Piktogrammernes billeder gemmes som Blob i IndexedDB, men <img>-tags skal
// bruge en URL. Denne hook laver den URL og rydder selv op efter sig, så vi
// ikke lækker hukommelse ved at glemme URL.revokeObjectURL().

import { useEffect, useState } from 'react'

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return url
}
