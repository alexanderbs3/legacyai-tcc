import { useEffect, useState, useSyncExternalStore } from 'react'
import { isRequestActive, subscribeToRequestActivity } from '../services/requestActivity'

const SHOW_DELAY_MS = 200

export function GlobalLoader() {
  const active = useSyncExternalStore(subscribeToRequestActivity, isRequestActive)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [active])

  if (!visible) return null

  return <div className="global-loader" role="status" aria-live="polite" aria-label="Carregando" />
}
