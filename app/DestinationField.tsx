'use client'

import { useState } from 'react'
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete'

export function DestinationField() {
  const [query, setQuery] = useState('')

  return (
    <div className="mb-[18px]">
      <PlaceAutocomplete
        id="destination"
        name="destination"
        required
        value={query}
        onValueChange={setQuery}
        placeholder="ex : Chamonix"
      />
    </div>
  )
}
