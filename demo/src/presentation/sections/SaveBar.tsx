type Props = {
  dirty: boolean
  saving: boolean
  version: number
  lastSavedAt: number | null
  canSubmit: boolean
  onSave: () => void
  onSubmit: () => void
}

export function SaveBar({
  dirty,
  saving,
  version,
  lastSavedAt,
  canSubmit,
  onSave,
  onSubmit,
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
      <button type="button" onClick={onSubmit} disabled={!canSubmit}>
        提交
      </button>
    </div>
  )
}
