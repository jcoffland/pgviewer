'use strict';
/**
 * igc-xc-score Solver
 * scoring library for paragliding flights
 * 
 * @module igc-xc-score
 * @author Momtchil Momtchev <momtchil@momtchev.com>
 */
import MinHeap from '../../util/MinHeap.js';
import { Solution } from './solution.js';
import { Range, Point } from './foundation.js';
import * as geom from './geom.js';
import * as Flight from './flight.js';
import scoringRules from './scoring-rules.js';

/**
 * This the solver
 * @param {IGCFile} flight flight track data in the igc_parser format
 * @param {object[]} [scoringTypes=undefined] undefined for FFVL or one of the elements of scoringRules
 * @param {object=} config optional config parameters
 * @param {number=} config.maxcycle maximum execution time of the solver in ms, each sucessive call will return a better solution, default undefined for unlimited
 * @param {boolean=} config.noflight do not include the flight track data in the output GeoJSON, default false
 * @param {boolean=} config.invalid include invalid GPS fixes when evaluating the flight, default false
 * @param {boolean=} config.hp use high-precision distance calculation (Vincenty's), much slower for slightly higher precision, default false
 * @param {boolean=} config.trim automatically detect launch and landing and trim the flight track, default false
 */
export default function* solver(flight, _scoringTypes, _config) {
    let reset;

    const scoringTypes = _scoringTypes || scoringRules.FFVL;
    const config = _config || {};
    Flight.analyze(flight, config);
    geom.init({ flight });
    if (config.hp)
        Point.prototype.distanceEarth = Point.prototype.distanceEarthVincentys;
    else
        Point.prototype.distanceEarth = Point.prototype.distanceEarthFCC;
    let solutionRoots = [];
    for (let scoringType of scoringTypes) {
        for (let l of flight.ll) {
            const opt = {
                flight,
                launch: l.launch,
                landing: l.landing,
                scoring: scoringType,
                config
            };
            let solutionRoot = new Solution([
                new Range(l.launch, l.landing),
                new Range(l.launch, l.landing),
                new Range(l.launch, l.landing)
            ], opt);
            solutionRoot.do_bound();
            solutionRoot.do_score();
            solutionRoots.push(solutionRoot);
        }
    }

    let best = solutionRoots[0];
    // Max-priority queue ordered by bound, with id as tie-breaker matching
    // the original SortedSet's total order.
    const less = (a, b) =>
        a.bound > b.bound || (a.bound == b.bound && a.id > b.id);
    let solutionQueue = new MinHeap(less);
    for (let r of solutionRoots) solutionQueue.push(r);
    let processed = 0;

    let tcum = 0;
    do {
        const tstart = Date.now();
        while (solutionQueue.fill > 0) {
            if (processed % 100 === 0) {
                if (config.env && config.env.v8 !== 'undefined') {
                    const mem = config.env.v8.getHeapStatistics();
                    if (mem.used_heap_size / mem.heap_size_limit > 0.98) {
                        /* c8 ignore next 4 */
                        console.error(`Out of memory: ${mem.used_heap_size/1024}KiB used` +
                            ` of ${mem.heap_size_limit/1024}KiB total`);
                        break;
                    }
                }
            }

            // Lazy prune: skip any popped entry whose bound is no longer
            // competitive against the current best. The original code did a
            // bulk prune using SortedSet's tree traversal; with a heap we
            // discard at pop time instead.
            let current;
            do current = solutionQueue.pop();
            while (current && current.bound <= best.score);
            if (!current) break;

            let children = current.do_branch();
            for (let s of children) {
                s.do_bound();
                if (s.bound <= best.score)
                    continue;
                s.do_score();
                processed++;
                if (s.score >= best.score && s.score > 0)
                    best = s;
                else
                    delete s.scoreInfo;
                solutionQueue.push(s);
                if (config.debug)
                    best.last = s;
            }
            if (processed > config.maxloop || (Date.now() - tstart) > config.maxcycle) {
                break;
            }
        }

        best.processed = processed;
        const currentUpperBound = solutionQueue.peek();
        best.currentUpperBound = currentUpperBound ? currentUpperBound.bound : best.bound;
        tcum += Date.now() - tstart;
        best.time = tcum;
        best.optimal = solutionQueue.fill == 0;

        if (best.optimal) {
            reset = true;
            return best;
        } else
            reset = yield best;
    } while (!reset);
}
