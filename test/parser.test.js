import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {parseIgc} from '../src/igc/parser.js'


const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = name => readFileSync(join(__dirname, 'fixtures', name), 'utf8')


describe('parseIgc on synthetic minimal file', () => {
  const igc = [
    'AXXXSAMPLE',
    'HFDTE140709',
    'HFPLTPILOTINCHARGE:Test Pilot',
    'HFGTYGLIDERTYPE:TestWing',
    'HFGIDGLIDERID:T-001',
    'B1101355206343N00006198WA0058700558',
    'B1101455206400N00006300WA0060000570',
    'B1102005206500N00006400WA0070000670',
    'B1102155206600N00006500WA0080000770',
    'B1103005206700N00006600WA0070000670',
    'B1103305206800N00006700WA0060000570',
    'B1104005206900N00006800WA0050000470',
    'B1104305207000N00006900WA0040000370',
  ].join('\n')

  it('parses B records', () => {
    const t = parseIgc(igc, 'synth.igc')
    expect(t.coords.length).toBe(8)
  })

  it('extracts header fields', () => {
    const t = parseIgc(igc, 'synth.igc')
    expect(t.pilotName).toBe('Test Pilot')
    expect(t.gliderType).toBe('TestWing')
    expect(t.gliderId).toBe('T-001')
  })

  it('uses GPS altitude when nonzero', () => {
    const t = parseIgc(igc, 'synth.igc')
    // ele field of first B record is 558
    expect(t.coords[0].ele).toBe(558)
  })

  it('parses date from HFDTE', () => {
    const t = parseIgc(igc, 'synth.igc')
    const first = t.coords[0].dt
    expect(first.getUTCFullYear()).toBe(2009)
    expect(first.getUTCMonth()).toBe(6)  // July (0-indexed)
    expect(first.getUTCDate()).toBe(14)
  })

  it('parses lat/lon correctly', () => {
    const t = parseIgc(igc, 'synth.igc')
    // 5206343N → 52° 06.343' N → 52 + 6.343/60 ≈ 52.10572°
    const close = (a, b, eps = 1e-5) => Math.abs(a - b) < eps
    expect(close(t.coords[0].latDeg, 52.10572)).toBe(true)
    // 00006198W → 0° 06.198' W → -(0 + 6.198/60) ≈ -0.10330°
    expect(close(t.coords[0].lonDeg, -0.10330)).toBe(true)
  })
})


describe('parseIgc on real fixture (sample.igc)', () => {
  const text = fixture('sample.igc')

  it('parses without throwing', () => {
    const t = parseIgc(text, 'sample.igc')
    expect(t.coords.length).toBeGreaterThan(0)
  })

  it('produces a valid track', () => {
    const t = parseIgc(text, 'sample.igc')
    expect(t.coords[0].dt instanceof Date).toBe(true)
    expect(t.elevationData).toBe(true)
    expect(t.bounds.ele.max).toBeGreaterThan(0)
  })

  it('parses C records (declaration)', () => {
    const t = parseIgc(text, 'sample.igc')
    if (t.declaration) {
      expect(t.declaration.tps.length).toBeGreaterThan(0)
      expect(t.declaration.name).toBe('Declaration')
    }
  })
})


describe('parseIgc edge cases', () => {
  it('throws on file with no B records', () => {
    expect(() => parseIgc('HFDTE140709\n', 'empty.igc')).toThrow(/no B records/)
  })

  it('skips bad records and keeps going', () => {
    const igc = [
      'HFDTE140709',
      'BBADRECORD',
      'B1101355206343N00006198WA0058700558',
      'B1101455206400N00006300WA0060000570',
    ].join('\n')
    const t = parseIgc(igc)
    expect(t.coords.length).toBe(2)
  })

  it('rolls over date for descending timestamps', () => {
    // Two B records where second has earlier time-of-day → should roll over
    const igc = [
      'HFDTE140709',
      'B2300005206343N00006198WA0058700558',
      'B0030005206400N00006300WA0060000570',
      'B0030305206500N00006400WA0060000570',
    ].join('\n')
    const t = parseIgc(igc)
    expect(t.coords.length).toBe(3)
    const day0 = t.coords[0].dt.getUTCDate()
    const day1 = t.coords[1].dt.getUTCDate()
    expect(day1).toBe(day0 + 1)
  })
})
