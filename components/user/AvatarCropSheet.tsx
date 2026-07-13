'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Sheet } from '@/components/ui/Sheet'
import { cropToBlob } from '@/lib/avatar-crop'

export function AvatarCropSheet({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setArea(pixels)
  }, [])

  async function handleConfirm() {
    if (!area) return
    setBusy(true)
    try {
      const blob = await cropToBlob(imageSrc, area)
      onConfirm(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onCancel} variant="bottom" labelledBy="avatar-crop-title">
      <h2 id="avatar-crop-title" className="mb-3 font-serif text-[20px] text-ink">
        Recadrer la photo
      </h2>

      <div className="relative h-[280px] w-full overflow-hidden rounded-[16px] bg-track">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        aria-label="Zoom"
        className="mt-4 w-full accent-terracotta"
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[14px] border-[1.5px] border-line-3 bg-card py-[13px] text-[14.5px] font-bold text-ink"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !area}
          className="flex-1 rounded-[14px] bg-terracotta py-[13px] text-[14.5px] font-bold text-on-dark disabled:opacity-50"
        >
          {busy ? 'Un instant…' : 'Valider'}
        </button>
      </div>
    </Sheet>
  )
}
