// Behavioral biometrics — collect mouse/keyboard/scroll/touch patterns.
// Bots and automation produce statistically distinct patterns: straight mouse
// paths, perfectly regular event intervals, zero idle time. Real humans have
// jitter, pauses, curve trajectories, variable cadence.

export interface BehaviorSample {
  // Mouse trajectory: sampled mouse positions (normalized 0-1)
  mouseMoves: number
  // Stddev of inter-move intervals (low = regular = bot-like)
  mouseMoveIntervalStd: number
  // Mean mouse move distance (bots often teleport or move in straight lines)
  mouseMoveDistanceMean: number
  // Mouse path "straightness": total distance / displacement. ~1 = straight (bot)
  mouseStraightness: number
  // Keystroke: count + interval stddev (typing cadence)
  keydowns: number
  keyIntervalStd: number
  // Scroll events + distinct velocity changes (humans vary speed)
  scrolls: number
  scrollVelocityChanges: number
  // Touch events (mobile)
  touches: number
  // Time spent on page collecting (ms)
  durationMs: number
  // Idle ratio: fraction of duration with no input events
  idleRatio: number
}

const SAMPLE_WINDOW_MS = 4000 // collect 4s of behavior before sending

export function collectBehavior(durationMs = SAMPLE_WINDOW_MS): Promise<BehaviorSample> {
  return new Promise((resolve) => {
    const mousePositions: { x: number; y: number; t: number }[] = []
    const mouseIntervals: number[] = []
    const mouseDistances: number[] = []
    const keyTimes: number[] = []
    let scrolls = 0
    let scrollVelocities: number[] = []
    let lastScrollY = window.scrollY
    let lastScrollT = performance.now()
    let touches = 0
    let lastInputT = performance.now()
    let idleMs = 0

    const start = performance.now()
    let lastMoveT = start

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      mousePositions.push({ x: e.clientX, y: e.clientY, t: now })
      if (mousePositions.length > 1) {
        const prev = mousePositions[mousePositions.length - 2]
        const dx = e.clientX - prev.x
        const dy = e.clientY - prev.y
        mouseDistances.push(Math.sqrt(dx * dx + dy * dy))
        mouseIntervals.push(now - lastMoveT)
      }
      lastMoveT = now
      lastInputT = now
    }

    const onKey = () => {
      keyTimes.push(performance.now())
      lastInputT = performance.now()
    }

    const onScroll = () => {
      const now = performance.now()
      const dy = Math.abs(window.scrollY - lastScrollY)
      const dt = now - lastScrollT
      if (dt > 0) scrollVelocities.push(dy / dt)
      lastScrollY = window.scrollY
      lastScrollT = now
      scrolls++
      lastInputT = now
    }

    const onTouch = () => {
      touches++
      lastInputT = performance.now()
    }

    // Idle tracking via interval
    const idleChecker = setInterval(() => {
      const now = performance.now()
      if (now - lastInputT > 500) {
        idleMs += 100
      }
    }, 100)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('keydown', onKey, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })

    setTimeout(() => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', onTouch)
      clearInterval(idleChecker)

      const duration = performance.now() - start

      resolve({
        mouseMoves: mousePositions.length,
        mouseMoveIntervalStd: stddev(mouseIntervals),
        mouseMoveDistanceMean: mean(mouseDistances),
        mouseStraightness: straightness(mousePositions),
        keydowns: keyTimes.length,
        keyIntervalStd: stddev(keyIntervals.map((t, i) => i > 0 ? t - keyTimes[i - 1] : 0).slice(1)),
        scrolls,
        scrollVelocityChanges: countChanges(scrollVelocities),
        touches,
        durationMs: duration,
        idleRatio: duration > 0 ? Math.min(idleMs / duration, 1) : 1
      })
    }, durationMs)
  })
}

function mean(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

// Straightness = displacement / total path length. ~1.0 = perfectly straight (bot).
function straightness(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  const first = points[0]
  const last = points[points.length - 1]
  const displacement = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2)
  return total > 0 ? Math.min(displacement / total, 1) : 0
}

function countChanges(arr: number[]): number {
  if (arr.length < 2) return 0
  let changes = 0
  let dir = 0
  for (let i = 1; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1]
    const newDir = diff > 0 ? 1 : diff < 0 ? -1 : 0
    if (newDir !== 0 && newDir !== dir) {
      changes++
      dir = newDir
    }
  }
  return changes
}
