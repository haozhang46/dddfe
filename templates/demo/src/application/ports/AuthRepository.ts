export interface AuthRepository {
  login(username: string, signal?: AbortSignal): Promise<string>
}
