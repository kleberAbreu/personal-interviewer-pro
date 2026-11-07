import { afterEach, describe, expect, it, vi } from 'vitest'
import { PcmPlayer } from './audio'

describe('PCM playback lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('does not resume paused playback on incoming chunks and drains only after all sources end', () => {
    const sources: Array<{ onended?: () => void }> = []
    const resume = vi.fn()
    const context = {
      state: 'suspended', currentTime: 0, destination: {}, resume,
      suspend: vi.fn(), close: vi.fn(),
      createBuffer: (_channels: number, length: number, rate: number) => ({ duration: length / rate, getChannelData: () => new Float32Array(length) }),
      createBufferSource: () => { const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; sources.push(source); return source },
    }
    vi.stubGlobal('AudioContext', class { constructor() { return context } })
    const player = new PcmPlayer()
    const drained = vi.fn()
    player.onDrained = drained
    player.pause()
    player.playPcm16(new Uint8Array(480))
    player.playPcm16(new Uint8Array(480))
    expect(resume).not.toHaveBeenCalled()
    sources[0].onended?.()
    expect(drained).not.toHaveBeenCalled()
    player.resume()
    expect(resume).toHaveBeenCalledOnce()
    sources[1].onended?.()
    expect(drained).toHaveBeenCalledOnce()
  })
})
