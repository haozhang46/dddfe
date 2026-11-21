import type { ReactNode } from "react";
import { Button, Text } from "../../../components/base";

type Props = {
  dirty: boolean;
  saving: boolean;
  version: number;
  lastSavedAt: number | null;
  onSave: () => void;
  submitButton: ReactNode;
};

export function SaveBar({ dirty, saving, version, lastSavedAt, onSave, submitButton }: Props) {
  return (
    <div className="save-bar">
      <Text as="span">
        version: <strong>{version}</strong>
        {dirty ? " · dirty" : " · clean"}
        {saving ? " · saving…" : ""}
      </Text>
      {lastSavedAt && (
        <Text as="span" className="muted">
          上次保存 {new Date(lastSavedAt).toLocaleTimeString()}
        </Text>
      )}
      <Button onClick={onSave} disabled={saving || !dirty}>
        手动保存
      </Button>
      {submitButton}
    </div>
  );
}
