import {parseIgc, simplifiedAltitudeProfile} from './src/igc/index.js'
import {readFileSync} from 'node:fs'

const text = readFileSync('test/fixtures/sample.igc', 'utf8')
const t = parseIgc(text, 'sample.igc')

console.log('coords:', t.coords.length)
console.log('elevationData:', t.elevationData)
console.log('bounds.ele:', t.bounds.ele.min, t.bounds.ele.max)
console.log('bounds.climb:', t.bounds.climb.min.toFixed(3), t.bounds.climb.max.toFixed(3))
console.log('bounds.speed:', t.bounds.speed.min.toFixed(3), t.bounds.speed.max.toFixed(3))
console.log('totalDzPositive:', t.totalDzPositive)
console.log('maxDzPositive:', t.maxDzPositive)
console.log('thermals:', t.thermals.length)
console.log('glides:', t.glides.length)
console.log('dives:', t.dives.length)
console.log('first coord ts:', t.coords[0].dt.toISOString())
console.log('last coord ts:', t.coords[t.coords.length - 1].dt.toISOString())
console.log('profile@10m:', simplifiedAltitudeProfile(t, 10).length)
console.log('profile@1m:', simplifiedAltitudeProfile(t, 1).length)
console.log('profile@10m head:', simplifiedAltitudeProfile(t, 10).slice(0, 3))
