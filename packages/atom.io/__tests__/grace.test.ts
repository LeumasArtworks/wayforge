import { vitest } from "vitest"

import type { Logger } from "atom.io"
import type { RegularAtomToken, TimelineToken } from "atom.io"
import {
	atom,
	atomFamily,
	redo,
	selector,
	setState,
	timeline,
	undo,
} from "atom.io"
import * as Internal from "atom.io/internal"
import * as Utils from "./__util__"

const LOG_LEVELS = [null, `error`, `warn`, `info`] as const
const CHOOSE = 1
let logger: Logger

beforeEach(() => {
	Internal.clearStore(Internal.IMPLICIT.STORE)
	Internal.IMPLICIT.STORE.loggers[0].logLevel = LOG_LEVELS[CHOOSE]
	logger = Internal.IMPLICIT.STORE.logger
	vitest.spyOn(logger, `error`)
	vitest.spyOn(logger, `warn`)
	vitest.spyOn(logger, `info`)
	vitest.spyOn(Utils, `stdout`)
})

describe(`not found`, () => {
	test(`Internal.NotFoundError is thrown`, () => {
		let caught: Error | undefined
		try {
			setState({ key: `a`, type: `atom` }, 1)
		} catch (thrown) {
			if (thrown instanceof Error) {
				caught = thrown
			}
		}
		expect(caught).toBeInstanceOf(Internal.NotFoundError)
	})
})

describe(`graceful handling of improper usage`, () => {
	describe(`a nested call to setState is a violation`, () => {
		test(`the inner call results in a no-op and a logger(error)`, () => {
			const a = atom({
				key: `a`,
				default: 0,
			})
			const b = atom({
				key: `b`,
				default: false,
			})
			const c = atom({
				key: `c`,
				default: `hi`,
			})
			const s = selector({
				key: `s`,
				get: ({ get }) => {
					return get(b) ? get(a) + 1 : 0
				},
				set: ({ set }, n) => {
					set(a, n)
					set(b, true)
					set(c, `bye`)
				},
			})
			const tl_ab = timeline({
				key: `a & b`,
				atoms: [a, b],
			})
			setState(a, (n) => {
				setState(b, true)
				return n + 1
			})

			expect(logger.error).toHaveBeenCalledWith(
				`❌`,
				`atom`,
				`b`,
				`failed to setState during a setState for "a"`,
			)
		})
	})
	describe(`giving an atom to multiple timelines is a violation`, () => {
		test(`the second timeline does not track the atom, and a logger(error) is given`, () => {
			const countState = atom({
				key: `count`,
				default: 0,
			})
			const countTimeline000 = timeline({
				key: `count_history`,
				atoms: [countState],
			})
			const countTimeline001 = timeline({
				key: `count_history_too`,
				atoms: [countState],
			})
			setState(countState, 1)
			const countTimeline0Data =
				Internal.IMPLICIT.STORE.timelines.get(`count_history`)
			const countTimeline1Data =
				Internal.IMPLICIT.STORE.timelines.get(`count_history_too`)

			expect(logger.error).toHaveBeenCalledWith(
				`❌`,
				`timeline`,
				`count_history_too`,
				`Failed to add atom "count" because it already belongs to timeline "count_history"`,
			)
			expect(countTimeline0Data?.history).toHaveLength(1)
			expect(countTimeline1Data?.history).toHaveLength(0)
		})
		test(`if a family is tracked by a timeline, a member of that family cannot be tracked by another timeline`, () => {
			const findCountState = atomFamily({
				key: `counts`,
				default: 0,
			})
			const countTimeline = timeline({
				key: `counts_history`,
				atoms: [findCountState],
			})
			const aCount = findCountState(`a`)
			const aCountTimeline = timeline({
				key: `a_count_history`,
				atoms: [aCount],
			})
			setState(aCount, 1)

			const countTimelineData = Internal.IMPLICIT.STORE.timelines.get(
				countTimeline.key,
			)
			const aCountTimelineData = Internal.IMPLICIT.STORE.timelines.get(
				aCountTimeline.key,
			)
			expect(logger.error).toHaveBeenCalledWith(
				`❌`,
				`timeline`,
				`a_count_history`,
				`Failed to add atom "counts("a")" because its family "counts" already belongs to timeline "counts_history"`,
			)
			console.log(Internal.withdraw(aCount, Internal.IMPLICIT.STORE))
			console.log(countTimelineData?.history)
			expect(countTimelineData?.history).toHaveLength(1)
			expect(aCountTimelineData?.history).toHaveLength(0)
		})
	})
})

describe(`recipes`, () => {
	describe(`timeline family recipe`, () => {
		it(`creates a timeline for each atom in the family`, () => {
			const f = atomFamily({
				key: `f`,
				default: 0,
			})
			const ftl = (
				key: string,
			): [state: RegularAtomToken<number>, timeline: TimelineToken<any>] => {
				const WritableToken = f(key)
				const timelineToken = timeline({
					key: `timeline for ${WritableToken.key}`,
					atoms: [WritableToken],
				})
				return [WritableToken, timelineToken]
			}
			const [a, atl] = ftl(`a`)

			setState(a, 1)
			undo(atl)
			undo(atl)
			redo(atl)
			redo(atl)
		})
	})
})
