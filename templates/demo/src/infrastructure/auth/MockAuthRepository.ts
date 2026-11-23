import type { AuthRepository } from "../../application/ports/AuthRepository";
import { idpPrincipalToAuthJson } from "../acl/authAcl";
import { delay } from "../mock/delay";
import type { RequestQueue } from "../queue/RequestQueue";
import { idpPrincipalForUsername } from "./mockUsers";

export function createMockAuthRepository(queue: RequestQueue): AuthRepository {
  return {
    login(username, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(200, qSignal);
          const principal = idpPrincipalForUsername(username);
          if (!principal) {
            throw new Error(`Unknown user: ${username}`);
          }
          return idpPrincipalToAuthJson(principal);
        },
        { key: `auth:login:${username}`, signal },
      );
    },
  };
}
