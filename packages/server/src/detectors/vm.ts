import type { DetectorResult, CollectedSignals } from '../types.js'

// VM / emulator / remote-desktop detection.
// VirtualBox/QEMU/VMware/Parallels expose telltale GPU renderer strings and
// hardware inconsistencies. Fraud farms and multi-accounting abuse VMs.
export function detectVm(signals: CollectedSignals): DetectorResult {
  let score = 0
  const reasons: string[] = []

  const renderer = (signals.stable.gpuRenderer || '').toLowerCase()
  const vendor = (signals.stable.gpuVendor || '').toLowerCase()

  // 1. Known VM GPU renderer strings
  const vmRenderers = [
    'svga3d', 'virtualbox', 'vbox', 'vmware', 'svga ii',
    'microsoft basic render', 'basevideo',
    'llvmpipe', 'softpipe', 'swrast', 'software',
    'gallium', 'virgl', 'zink',
    'parallels', 'apple paravirtual',
    'qemu', 'std vga', 'cirrus'
  ]
  for (const v of vmRenderers) {
    if (renderer.includes(v)) {
      score += 45
      reasons.push(`vm_gpu:${v}`)
      break
    }
  }

  // 2. Generic/anonymized GPU (Safari "Apple GPU" on Intel = not VM, but on
  // non-Apple platforms generic GPU is suspicious)
  if (renderer === 'unknown' || renderer === '') {
    if (!signals.stable.platform?.toLowerCase().includes('mac') &&
        !signals.stable.platform?.toLowerCase().includes('iphone') &&
        !signals.stable.platform?.toLowerCase().includes('apple')) {
      score += 20
      reasons.push('no_gpu_info')
    }
  }

  // 3. Inconsistency: high CPU cores (server-class) + software rendering.
  // VMs on beefy hosts often report many cores but software GL.
  if (signals.stable.cpuCores >= 16 && vmRenderers.some((v) => renderer.includes(v))) {
    score += 15
    reasons.push('server_cores_vm_gpu')
  }

  // 4. Vendor/renderer mismatch (e.g. vendor "Google" + renderer "ANGLE" only)
  if (vendor === 'google' && renderer === 'google swiftshader') {
    score += 40
    reasons.push('swiftshader')
  }

  const detected = score >= 40
  return {
    flag: 'vm',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
