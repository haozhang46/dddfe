import type { ReactNode } from 'react'

type Props = {
  dirty: boolean
  saving: boolean
  version: number
  lastSavedAt: number | null
  onSave: () => void
  submitButton: ReactNode
}

export function SaveBar({
  dirty,
  saving,
  version,
  lastSavedAt,
  onSave,
  submitButton,
}: Props) {
  return (
    <div className="save-bar">
      <span>
        version: <strong>{version}</strong>
        {dirty ? ' · dirty' : ' · clean'}
        {saving ? ' · saving…' : ''}
      </span>
      {lastSavedAt && (
        <span className="muted">上次保存 {new Date(lastSavedAt).toLocaleTimeString()}</span>
      )}
      <button type="button" onClick={onSave} disabled={saving || !dirty}>
        手动保存
      </button>
      {submitButton}
    </div>
  )
}
