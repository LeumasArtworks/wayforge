import type { Atom } from ".."
import { isAtomDefault, markAtomAsNotDefault } from "../atom"
import { cacheValue } from "../caching"
import type { Transceiver } from "../mutable"
import { markDone } from "../operation"
import { readOrComputeValue } from "../read-or-compute-value"
import type { Store } from "../store"
import { become } from "./become"
import { copyMutableIfWithinTransaction } from "./copy-mutable-in-transaction"
import { emitUpdate } from "./emit-update"
import { evictDownStream } from "./evict-downstream"
import { stowUpdate } from "./stow-update"

export const setAtom = <T>(
	atom: Atom<T>,
	next: T | ((oldValue: T) => T),
	target: Store,
): void => {
	const oldValue = readOrComputeValue(atom, target)
	let newValue = copyMutableIfWithinTransaction(oldValue, atom, target)
	newValue = become(next)(newValue)
	target.logger.info(`📝`, `atom`, atom.key, `set to`, newValue)
	newValue = cacheValue(atom.key, newValue, atom.subject, target)
	if (isAtomDefault(atom.key, target)) {
		markAtomAsNotDefault(atom.key, target)
	}
	markDone(atom.key, target)
	evictDownStream(atom, target)
	const update = { oldValue, newValue }
	if (target.transactionMeta === null) {
		emitUpdate(atom, update, target)
	} else if (target.parent) {
		if (target.on.transactionApplying.state === null) {
			stowUpdate(atom, update, target)
		} else if (atom.key.startsWith(`*`)) {
			const mutableKey = atom.key.slice(1)
			const mutableAtom = target.atoms.get(mutableKey) as Atom<any>
			let mutable: Transceiver<any> = target.valueMap.get(mutableKey)
			mutable = copyMutableIfWithinTransaction(mutable, mutableAtom, target)
			mutable.do(update.newValue)
		}
	}
}
