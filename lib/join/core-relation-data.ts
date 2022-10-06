import { isString } from "fp-ts/lib/string"
import type { Json, JsonObj } from "json"

import { isArray } from "../Anvil/array"
import { isObject, isRecord } from "../Anvil/object"

export const RELATION_TYPES = [`1:1`, `1:n`, `n:n`] as const

export type RelationType = typeof RELATION_TYPES[number]

export const isRelationType = (x: unknown): x is RelationType =>
  RELATION_TYPES.includes(x as RelationType)

export type RelationData<CONTENT extends JsonObj | null = null> = {
  contents: JsonObj<string, CONTENT>
  relations: JsonObj<string, string[]>
  relationType: RelationType
}

export const EMPTY_RELATION_DATA: RelationData = {
  contents: {},
  relations: {},
  relationType: `n:n`,
}

export const isRelationData =
  <CONTENT extends JsonObj | null = null>(
    isContent?: (json: Json) => json is CONTENT
  ) =>
  (input: unknown): input is RelationData<CONTENT> =>
    isObject<RelationData<CONTENT>>({
      contents: isContent ? isRecord(isString, isContent) : isObject({}),
      relations: isRecord(isString, isArray(isString)),
      relationType: isRelationType,
    })(input)
