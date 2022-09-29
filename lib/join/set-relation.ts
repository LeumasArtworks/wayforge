import { addTo, isEmptyArray } from "../fp-tools/array"
import { treeShake as removeProperties } from "../fp-tools/object"
import type { Json } from "../json"
import type { RelationData } from "./core-relation-data"
import { getRelation } from "./get-relation"
import { setContent } from "./relation-contents"

export const setManyToMany = <CONTENT extends Json | null = null>(
  map: RelationData<CONTENT>,
  idA: string,
  idB: string,
  ...rest: CONTENT extends null ? [] | [undefined] : [CONTENT]
): RelationData<CONTENT> => {
  const next = {
    ...map,
    relations: {
      ...map.relations,
      [idA]: addTo(map.relations[idA] ?? [])(idB),
      [idB]: addTo(map.relations[idB] ?? [])(idA),
    },
  }
  const content = rest[0] as CONTENT | undefined
  return content ? setContent(next, idA, idB, content) : next
}

const removeEmpties = removeProperties(isEmptyArray)

export const set1ToMany = <CONTENT extends Json | null = null>(
  current: RelationData<CONTENT>,
  leaderId: string,
  followerId: string,
  ...rest: CONTENT extends null ? [] | [undefined] : [CONTENT]
): RelationData<CONTENT> => {
  const relations = { ...current.relations }
  const prevLeaderId = getRelation(current, followerId)
  const next = {
    ...current,
    relations: {
      ...relations,
      ...(prevLeaderId &&
        prevLeaderId !== leaderId && {
          [prevLeaderId]: relations[prevLeaderId].filter(
            (id) => id !== followerId
          ),
        }),
      [followerId]: [leaderId],
      [leaderId]: addTo(relations[leaderId] ?? [])(followerId),
    },
  }
  const content = rest[0] as CONTENT | undefined
  return content ? setContent(next, leaderId, followerId, content) : next
}

export const set1To1 = <CONTENT extends Json | null = null>(
  current: RelationData<CONTENT>,
  wifeId: string,
  husbandId: string,
  ...rest: CONTENT extends null ? [] | [undefined] : [CONTENT]
): RelationData<CONTENT> => {
  const prevWifeId = getRelation(current, husbandId)
  const prevHusbandId = getRelation(current, wifeId)
  const next = {
    ...current,
    relations: removeEmpties({
      ...current.relations,
      ...(prevWifeId && { [prevWifeId]: [] }),
      ...(prevHusbandId && { [prevHusbandId]: [] }),
      [wifeId]: [husbandId],
      [husbandId]: [wifeId],
    }),
  }

  const content = rest[0] as CONTENT | undefined
  return content ? setContent(next, wifeId, husbandId, content) : next
}

export const setRelation = <CONTENT extends Json | null = null>(
  current: RelationData<CONTENT>,
  idA: string,
  idB: string,
  ...rest: CONTENT extends null ? [] | [undefined] : [CONTENT]
): RelationData<CONTENT> => {
  switch (current.relationType) {
    case `1:1`:
      return set1To1(current, idA, idB, ...rest)
    case `1:n`:
      return set1ToMany(current, idA, idB, ...rest)
    case `n:n`:
      return setManyToMany(current, idA, idB, ...rest)
  }
}
