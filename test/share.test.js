import {describe, it, expect} from 'vitest'
import {pack, unpack} from '../src/share/bundle.js'


describe('share bundle', () => {
  it('round-trips a single flight', async () => {
    const flights = [{name: 'a.igc', text: 'HFDTE140709\nB1101350000000N00000000EA0050000500\n'}]
    const blob = await pack(flights)
    const back = await unpack(blob)
    expect(back).toEqual(flights)
  })

  it('round-trips multiple flights', async () => {
    const flights = [
      {name: 'a.igc', text: 'a body'},
      {name: 'b.igc', text: 'b body with \"quotes\" and \\backslash'},
    ]
    const blob = await pack(flights)
    const back = await unpack(blob)
    expect(back).toEqual(flights)
  })

  it('compresses repetitive text', async () => {
    const flights = [{name: 'long.igc', text: 'B1101350000000N00000000EA0050000500\n'.repeat(1000)}]
    const blob = await pack(flights)
    expect(blob.size).toBeLessThan(flights[0].text.length / 5)
  })

  it('throws on bundle missing flights array', async () => {
    const stream = new Blob([JSON.stringify({something: 'else'})]).stream()
      .pipeThrough(new CompressionStream('gzip'))
    const blob = new Blob([await new Response(stream).arrayBuffer()])
    await expect(unpack(blob)).rejects.toThrow(/flights/)
  })
})
