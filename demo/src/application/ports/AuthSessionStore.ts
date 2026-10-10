export interface AuthSessionStore {
  load(): string | null
  save(authJson: string): void
  clear(): void
}
