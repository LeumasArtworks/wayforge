import { isNumber } from "fp-ts/lib/number"
import { atom, selectorFamily } from "recoil"

import { isRecord } from "~/lib/Anvil/object"
import type { Identified } from "~/lib/id/identified"
import { Join } from "~/lib/join"
import { socketRelations } from "~/lib/recoil-tools/effects/socket-io"

import type { Energy } from "./energy"
import { DEFAULT_ENERGY, findEnergyState } from "./energy"
import { socket } from "./socket"

export const energyFeaturesState = atom<Join>({
  key: `energyFeatures`,
  default: new Join({ relationType: `1:n` }),
  effects: [
    socketRelations({
      type: `energy_reaction`,
      id: `energyFeatures`,
      socket,
    }),
  ],
})

export type Amount = { amount: number }
export const hasAmount = isRecord((s): s is `amount` => s === `amount`, isNumber)
export const DEFAULT_ENERGY_AMOUNT: Amount = { amount: 1 }

export type Reagent = Amount & Identified
export type Product = Amount & Identified

export const reactionReagentsState = atom<Join<Amount>>({
  key: `reactionReagents`,
  default: new Join<{ amount: number }>({ relationType: `n:n` }),
  effects: [
    socketRelations({
      type: `energy_reaction`,
      id: `reactionReagents`,
      socket,
      refineContent: hasAmount,
    }),
  ],
})

export const reactionProductsState = atom<Join<Amount>>({
  key: `reactionProducts`,
  default: new Join<Amount>({ relationType: `n:n` }),
  effects: [
    socketRelations({
      type: `energy_reaction`,
      id: `reactionProducts`,
      socket,
      refineContent: hasAmount,
    }),
  ],
})

export const findReactionEnergyState = selectorFamily<Energy, string>({
  key: `reactionEnergy`,
  get:
    (id) =>
    ({ get }) => {
      const energyId = get(energyFeaturesState).getRelatedId(id)
      return energyId ? findEnergyState(energyId) : DEFAULT_ENERGY
    },
})
