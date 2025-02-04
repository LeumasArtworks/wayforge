"use client"

import type { LoggerIcon, TokenDenomination } from "atom.io"
import { AtomIOLogger, findState } from "atom.io"
import { IMPLICIT } from "atom.io/internal"
import { useJSON } from "atom.io/react"
import { usePullFamilyMember, usePullMutable } from "atom.io/realtime-react"

import { cardIndex, cardValuesIndex } from "~/apps/node/lodge/src/store/game"
import * as CardGroups from "~/apps/node/lodge/src/store/game/card-groups"

import { MyDomain } from "./my-domain/MyDomain"
import { EnemyDomains } from "./other-players/EnemyDomains"
import { Public } from "./public/Public"

import scss from "./Game.module.scss"

IMPLICIT.STORE.loggers[0] = new AtomIOLogger(
	`info`,
	(icon, tokenType, tokenKey, message) => {
		const allowedIcons: LoggerIcon[] = [`🛄`]
		const ignoredTokenTypes: TokenDenomination[] = []
		const ignoredTokens = [`actions`, `radialMode`, `windowMousePosition`]
		const ignoredMessageContents: string[] = []
		if (!allowedIcons.includes(icon)) return false
		if (ignoredTokenTypes.includes(tokenType)) return false
		if (ignoredTokens.includes(tokenKey)) return false
		for (const ignoredMessageContent of ignoredMessageContents) {
			if (message.includes(ignoredMessageContent)) return false
		}
		return true
	},
)

function DeckSync(props: { id: string }): null {
	usePullFamilyMember(findState(CardGroups.deckStates, props.id))
	return null
}
function HandSync(props: { id: string }): null {
	usePullFamilyMember(findState(CardGroups.handStates, props.id))
	return null
}
function TrickSync(props: { id: string }): null {
	usePullFamilyMember(findState(CardGroups.trickStates, props.id))
	return null
}
function CoreSync({ roomId }: GameProps): JSX.Element {
	const deckIds = useJSON(findState(CardGroups.deckIndices, roomId))
	const handIds = useJSON(findState(CardGroups.handIndices, roomId))
	const trickIds = useJSON(findState(CardGroups.trickIndices, roomId))
	return (
		<>
			{deckIds.members.map((id) => (
				<DeckSync key={id} id={id} />
			))}
			{handIds.members.map((id) => (
				<HandSync key={id} id={id} />
			))}
			{trickIds.members.map((id) => (
				<TrickSync key={id} id={id} />
			))}
		</>
	)
}

export type GameProps = {
	roomId: string
}
export function Game({ roomId }: GameProps): JSX.Element {
	usePullMutable(cardIndex)
	usePullMutable(findState(CardGroups.deckIndices, roomId))
	usePullMutable(findState(CardGroups.handIndices, roomId))
	usePullMutable(findState(CardGroups.trickIndices, roomId))
	usePullMutable(cardValuesIndex)

	return (
		<>
			<CoreSync roomId={roomId} />
			<div className={scss.class}>
				{/* <Controls /> */}
				<section data-css="enemy-domains">
					<EnemyDomains />
				</section>
				<section data-css="public">
					<Public roomId={roomId} />
				</section>
				<section data-css="my-domain">
					<MyDomain />
				</section>
			</div>
		</>
	)
}
