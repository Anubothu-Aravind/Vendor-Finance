import React, { useRef, useState } from 'react'

/**
 * LogoUploader
 *
 * Image picker supporting drag & drop, file selection, camera capture,
 * and clipboard paste. Clean, icon-free layout.
 */
export default function LogoUploader({
  currentLogoUrl,
  pendingPreviewUrl,
  onFileSelect,
  onRemove,
  disabled = false,
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const activeDisplayUrl = pendingPreviewUrl || currentLogoUrl

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      onFileSelect(file)
    }
  }

  const validateFile = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowed.includes(file.type)) {
      alert('Only .jpg and .png files are accepted')
      return false
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size must be under 2MB')
      return false
    }
    return true
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && validateFile(file)) {
      onFileSelect(file)
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file && validateFile(file)) {
          onFileSelect(file)
          break
        }
      }
    }
  }

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: dragOver ? '2px dashed var(--color-primary)' : '1px dashed var(--color-border)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: dragOver ? 'var(--color-primary-muted, rgba(0,200,150,0.05))' : 'var(--color-bg-surface)',
          transition: 'all 150ms ease-out',
          minHeight: '130px',
        }}
      >
        {activeDisplayUrl ? (
          <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)', background: '#fff' }}>
            <img src={activeDisplayUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Drag and drop logo here
          </p>
        )}

        {pendingPreviewUrl && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', marginTop: '6px' }}>
            Pending Save
          </span>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {activeDisplayUrl ? 'Change Logo' : 'Upload Logo'}
        </button>

        {activeDisplayUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: '#ef4444',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
