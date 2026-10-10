import type { FieldPath, Option, OrderDraft } from '../../../domain/order'
import { connectDevtools } from '../../devtools'
import type { Deps } from './createDeps'

export type Phase = 'idle' | 'loading' | 'editing' | 'saving' | 'submitting'

export type OrchestratorState = {
  phase: Phase
  draft: OrderDraft | null
  cityOptions: Option[]
  error: string | null
  epoch: number
  dirty: boolean
  lastSavedAt: number | null
}

type Ev =
  | { type: 'HYDRATE' }
  | { type: 'LOADED'; draft: OrderDraft; cityOptions: Option[]; epoch: number }
  | { type: 'LOAD_FAIL'; error: string; epoch: number }
  | { type: 'FIELD_OK'; draft: OrderDraft; cityOptions?: Option[]; epoch: number }
  | { type: 'FIELD_FAIL'; error: string; epoch: number }
  | { type: 'SAVE_START'; epoch: number }
  | { type: 'SAVED'; draft: OrderDraft; epoch: number }
  | { type: 'SAVE_FAIL'; error: string; epoch: number }

const initial: OrchestratorState = {
  phase: 'idle',
  draft: null,
  cityOptions: [],
  error: null,
  epoch: 0,
  dirty: false,
  lastSavedAt: null,
}

function reduce(s: OrchestratorState, e: Ev): OrchestratorState {
  switch (e.type) {
    case 'HYDRATE':
      return { ...s, phase: 'loading', epoch: s.epoch + 1, error: null }
    case 'LOADED':
      if (e.epoch !== s.epoch) return s
      return {
        ...s,
        phase: 'editing',
        draft: e.draft,
        cityOptions: e.cityOptions,
        dirty: false,
        error: null,
      }
    case 'LOAD_FAIL':
      if (e.epoch !== s.epoch) return s
      return { ...s, phase: 'idle', error: e.error }
    case 'FIELD_OK':
      if (e.epoch !== s.epoch) return s
      return {
        ...s,
        phase: 'editing',
        draft: e.draft,
        cityOptions: e.cityOptions ?? s.cityOptions,
        dirty: true,
        error: null,
      }
    case 'FIELD_FAIL':
      if (e.epoch !== s.epoch) return s
      return { ...s, phase: 'editing', error: e.error }
    case 'SAVE_START':
      return { ...s, phase: 'saving', epoch: e.epoch, error: null }
    case 'SAVED':
      if (e.epoch !== s.epoch) return s
      return {
        ...s,
        phase: 'editing',
        draft: e.draft,
        dirty: false,
        lastSavedAt: Date.now(),
        error: null,
      }
    case 'SAVE_FAIL':
      if (e.epoch !== s.epoch) return s
      return { ...s, phase: 'editing', error: e.error }
    default:
      return s
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function createOrchestrator(deps: Deps, orderId = 'order-1') {
  let state = initial
  const listeners = new Set<() => void>()
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let fieldEpoch = 0
  const devtools = connectDevtools(`order:${orderId}`)
  devtools?.init(state)

  function emit() {
    listeners.forEach((l) => l())
  }

  function dispatch(e: Ev) {
    state = reduce(state, e)
    devtools?.send({ type: e.type }, state)
    emit()
  }

  async function hydrate() {
    dispatch({ type: 'HYDRATE' })
    const epoch = state.epoch
    try {
      const draft = await deps.loadOrder(orderId)
      const cityOptions = draft.province ? await deps.loadCities(draft.province) : []
      dispatch({ type: 'LOADED', draft, cityOptions, epoch })
    } catch (err) {
      if (isAbort(err)) return
      dispatch({ type: 'LOAD_FAIL', error: String(err), epoch })
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveNow()
    }, 400)
  }

  async function saveNow() {
    const draft = state.draft
    if (!draft || !state.dirty) return
    const epoch = state.epoch + 1
    dispatch({ type: 'SAVE_START', epoch })
    try {
      const saved = await deps.saveDraft(draft, draft.version)
      dispatch({ type: 'SAVED', draft: saved, epoch })
    } catch (err) {
      if (isAbort(err)) return
      dispatch({ type: 'SAVE_FAIL', error: String(err), epoch })
    }
  }

  async function changeField(path: FieldPath, value: unknown) {
    const draft = state.draft
    if (!draft) return
    fieldEpoch += 1
    const myEpoch = fieldEpoch
    const reduceEpoch = state.epoch + 1
    state = { ...state, epoch: reduceEpoch }
    try {
      const result = await deps.changeField(draft, path, value)
      if (myEpoch !== fieldEpoch) return
      dispatch({
        type: 'FIELD_OK',
        draft: result.draft,
        cityOptions: result.cityOptions,
        epoch: reduceEpoch,
      })
      scheduleSave()
    } catch (err) {
      if (isAbort(err)) return
      if (myEpoch !== fieldEpoch) return
      dispatch({ type: 'FIELD_FAIL', error: String(err), epoch: reduceEpoch })
    }
  }

  return {
    getState: () => state,
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    hydrate,
    changeField,
    saveNow,
  }
}

export type Orchestrator = ReturnType<typeof createOrchestrator>
