type Listener = () => void

let activeRequests = 0
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

export function requestStarted() {
  activeRequests += 1
  emit()
}

export function requestEnded() {
  activeRequests = Math.max(0, activeRequests - 1)
  emit()
}

export function subscribeToRequestActivity(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isRequestActive() {
  return activeRequests > 0
}
