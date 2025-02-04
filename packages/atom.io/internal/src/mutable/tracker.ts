import type { FamilyMetadata, MutableAtomToken, RegularAtomToken } from "atom.io"
import { getState, setState } from "atom.io"
import type { Json } from "atom.io/json"

import type { Store } from ".."
import { newest, subscribeToState, subscribeToTimeline } from ".."
import { createRegularAtom } from "../atom"
import type { Transceiver } from "./transceiver"

/**
 * @internal Give the tracker a transceiver state and a store, and it will
 * subscribe to the transceiver's inner value. When the inner value changes,
 * the tracker will update its own state to reflect the change.
 */
export class Tracker<Mutable extends Transceiver<any>> {
	private Update: Mutable extends Transceiver<infer Signal> ? Signal : never

	private initializeState(
		mutableState: MutableAtomToken<Mutable, Json.Serializable>,
		store: Store,
	): RegularAtomToken<typeof this.Update | null> {
		const latestUpdateStateKey = `*${mutableState.key}`
		store.atoms.delete(latestUpdateStateKey)
		store.valueMap.delete(latestUpdateStateKey)
		const familyMetaData: FamilyMetadata | undefined = mutableState.family
			? {
					key: `*${mutableState.family.key}`,
					subKey: mutableState.family.subKey,
			  }
			: undefined
		const latestUpdateState = createRegularAtom<
			(Mutable extends Transceiver<infer Signal> ? Signal : never) | null
		>(
			{
				key: latestUpdateStateKey,
				default: null,
			},
			familyMetaData,
			store,
		)
		if (store.parent?.valueMap.has(latestUpdateStateKey)) {
			const parentValue = store.parent.valueMap.get(latestUpdateStateKey)
			store.valueMap.set(latestUpdateStateKey, parentValue)
		}

		return latestUpdateState
	}

	private unsubscribeFromInnerValue: () => void
	private unsubscribeFromState: () => void
	private observeCore(
		mutableState: MutableAtomToken<Mutable, any>,
		latestUpdateState: RegularAtomToken<typeof this.Update | null>,
		store: Store,
	): void {
		const subscriptionKey = `tracker:${store.config.name}:${
			store.transactionMeta === null ? `main` : store.transactionMeta.update.key
		}:${mutableState.key}`
		const originalInnerValue = getState(mutableState, store)
		const target = newest(store)
		this.unsubscribeFromInnerValue = originalInnerValue.subscribe(
			`tracker:${store.config.name}:${
				target.transactionMeta === null
					? `main`
					: target.transactionMeta.update.key
			}`,
			(update) => {
				if (target.operation.open) {
					const unsubscribe = target.on.operationClose.subscribe(
						subscriptionKey,
						() => {
							unsubscribe()
							setState(latestUpdateState, update, target)
						},
					)
				} else {
					setState(mutableState, (current) => current, target)
					setState(latestUpdateState, update, target)
				}
			},
		)
		this.unsubscribeFromState = subscribeToState(
			mutableState,
			(update) => {
				if (update.newValue !== update.oldValue) {
					this.unsubscribeFromInnerValue()
					const target = newest(store)
					this.unsubscribeFromInnerValue = update.newValue.subscribe(
						subscriptionKey,
						(update) => {
							if (target.operation.open) {
								const unsubscribe = target.on.operationClose.subscribe(
									subscriptionKey,
									() => {
										unsubscribe()
										setState(latestUpdateState, update, target)
									},
								)
							} else {
								setState(mutableState, (current) => current, target)
								setState(latestUpdateState, update, target)
							}
						},
					)
				}
			},
			subscriptionKey,
			store,
		)
	}

	private updateCore<Core extends Transceiver<any>>(
		mutableState: MutableAtomToken<Core, Json.Serializable>,
		latestUpdateState: RegularAtomToken<typeof this.Update | null>,
		store: Store,
	): void {
		const subscriptionKey = `tracker:${store.config.name}:${
			store.transactionMeta === null ? `main` : store.transactionMeta.update.key
		}:${mutableState.key}`
		subscribeToState(
			latestUpdateState,
			({ newValue, oldValue }) => {
				const timelineId = store.timelineAtoms.getRelatedKey(
					latestUpdateState.key,
				)
				if (timelineId) {
					const timelineData = store.timelines.get(timelineId)
					if (timelineData?.timeTraveling) {
						const unsubscribe = subscribeToTimeline(
							{ key: timelineId, type: `timeline` },
							(update) => {
								unsubscribe()
								setState(
									mutableState,
									(transceiver) => {
										if (update === `redo` && newValue) {
											transceiver.do(newValue)
										} else if (update === `undo` && oldValue) {
											transceiver.undo(oldValue)
										}
										return transceiver
									},
									store,
								)
							},
							subscriptionKey,
							store,
						)
						return
					}
				}

				const unsubscribe = store.on.operationClose.subscribe(
					subscriptionKey,
					() => {
						unsubscribe()
						const mutable = getState(mutableState, store)
						// debugger
						const updateNumber =
							newValue === null ? -1 : mutable.getUpdateNumber(newValue)
						const eventOffset = updateNumber - mutable.cacheUpdateNumber
						if (newValue && eventOffset === 1) {
							// ❗ new:"0=add:\"myHand\"",old:"0=add:\"deckId\""
							setState(
								mutableState,
								(transceiver) => (transceiver.do(newValue), transceiver),
								store,
							)
						}
					},
				)
			},
			subscriptionKey,
			store,
		)
	}

	public mutableState: MutableAtomToken<Mutable, Json.Serializable>
	public latestUpdateState: RegularAtomToken<typeof this.Update | null>

	public dispose: () => void

	public constructor(
		mutableState: MutableAtomToken<Mutable, Json.Serializable>,
		store: Store,
	) {
		this.mutableState = mutableState
		const target = newest(store)
		this.latestUpdateState = this.initializeState(mutableState, target)
		this.observeCore(mutableState, this.latestUpdateState, target)
		this.updateCore(mutableState, this.latestUpdateState, target)
		target.trackers.set(mutableState.key, this)
		this.dispose = () => {
			this.unsubscribeFromInnerValue()
			this.unsubscribeFromState()
			target.trackers.delete(mutableState.key)
		}
	}
}
