import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAppDeps } from "../../AppDepsContext";
import { buildViewModel, type FormViewModel } from "./buildViewModel";
import { createOrchestrator, type Orchestrator } from "./orchestrator";

export type OrderPageModel = {
  orderId: string;
  orchestrator: Orchestrator;
  vm: FormViewModel | null;
  loading: boolean;
};

/**
 * Page hook: creates the order orchestrator, hydrates once, and projects ViewModel.
 * Stateful wiring lives here; pure projection stays in `buildViewModel`.
 */
export function useOrderPage(orderId: string): OrderPageModel {
  const { order: deps } = useAppDeps();

  const orchestrator = useMemo(
    function createPageOrchestrator() {
      return createOrchestrator(deps, orderId);
    },
    [deps, orderId],
  );

  const state = useSyncExternalStore(
    orchestrator.subscribe,
    orchestrator.getState,
    orchestrator.getState,
  );

  useEffect(
    function hydrateOrder() {
      void orchestrator.hydrate();
    },
    [orchestrator],
  );

  const vm = useMemo(
    function projectViewModel() {
      if (!state.draft) return null;
      return buildViewModel({
        draft: state.draft,
        phase: state.phase,
        cityOptions: state.cityOptions,
        dirty: state.dirty,
        lastSavedAt: state.lastSavedAt,
        error: state.error,
      });
    },
    [state],
  );

  return {
    orderId,
    orchestrator,
    vm,
    loading: state.phase === "loading" || !vm,
  };
}
