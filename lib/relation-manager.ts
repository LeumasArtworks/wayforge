import inventory from "hamt_plus"
import type { Hamt } from "hamt_plus"

import type { JsonObj } from "./json"

const mob = <K extends keyof any, I, O>(
  obj: Record<K, I>,
  fn: (val: I, key: K) => O
): Record<K, O> => {
  const newObj = {} as Record<K, O>
  const entries = Object.entries(obj) as [K, I][]
  entries.forEach(([key, val]) => {
    newObj[key] = fn(val, key)
  })
  return newObj
}

export type RelationMember<Contribution> = {
  id: string
  data: Contribution
}
export type RelationBase<
  RoleKeys extends string,
  RelationProperties,
  MemberContribution
> = {
  members: Record<RoleKeys, RelationMember<MemberContribution>[]>
  data: RelationProperties
}

export type RoleConfigJson<
  RoleKeys extends string,
  TypeKeys extends string
> = JsonObj<RoleKeys, TypeKeys>

export type RelationManagerConfigJson<
  RoleKeys extends string,
  TypeKeys extends string,
  RelationProperties,
  MemberContribution
> = {
  roles: RoleConfigJson<RoleKeys, TypeKeys>
}

const indexRoles = <RoleKeys extends string, TypeKeys extends string>(
  config: RoleConfigJson<RoleKeys, TypeKeys>
): Record<TypeKeys, Set<RoleKeys>> => {
  const roles = {} as Record<TypeKeys, Set<RoleKeys>>
  for (const [roleKey, typeKey] of Object.entries(config) as [
    role: RoleKeys,
    entity: TypeKeys
  ][]) {
    if (!roles[typeKey]) {
      roles[typeKey] = new Set()
    }
    roles[typeKey].add(roleKey)
  }
  return roles
}

export class RoleConfig<RoleKeys extends string, TypeKeys extends string> {
  public rolesByType: Record<TypeKeys, Set<RoleKeys>>
  public typesByRole: Record<RoleKeys, TypeKeys>

  public constructor(json: RoleConfigJson<RoleKeys, TypeKeys>) {
    this.typesByRole = json
    this.rolesByType = indexRoles(json)
  }

  public toJSON = (): RoleConfigJson<RoleKeys, TypeKeys> => this.typesByRole
}

export type RelationManagerJson<
  TypeKeys extends string,
  RoleKeys extends string,
  RelationProperties,
  MemberContribution,
  Relation extends RelationBase<RoleKeys, RelationProperties, MemberContribution>
> = {
  config: RoleConfigJson<RoleKeys, TypeKeys>
  relations: Record<string, Relation>
}

export const hamtToRecord = <T>(hamt: Hamt<T>): Record<string, T> => {
  const json = {} as Record<string, T>
  for (const [key, value] of hamt.entries()) {
    json[key] = value
  }
  return json
}

export const recordToHamt = <T>(json: Record<string, T>): Hamt<T> => {
  let hamt = inventory.make<T>()
  for (const [key, value] of Object.entries(json)) {
    hamt = hamt.set(key, value)
  }
  return hamt
}

export class RelationManager<
  RoleKeys extends string,
  TypeKeys extends string,
  RelationProperties,
  RelationContribution,
  Relation extends RelationBase<
    RoleKeys,
    RelationProperties,
    RelationContribution
  >
> {
  public readonly config: RoleConfig<RoleKeys, TypeKeys>

  public relations: Hamt<Relation>

  public constructor({
    config,
    relations,
  }: RelationManagerJson<
    TypeKeys,
    RoleKeys,
    RelationProperties,
    RelationContribution,
    Relation
  >) {
    this.config = new RoleConfig(config)
    this.relations = recordToHamt(relations)
  }

  // CharacterRelations.where(`kid`).named(`finger`).plays[`capableGuy`]
  public where(type: TypeKeys): {
    named: (id: string) => { plays: Record<RoleKeys, Relation[]> }
  } {
    const relationsByRole = {} as Record<RoleKeys, Relation[]>
    const roles = Object.values(this.config.typesByRole) as RoleKeys[]
    const rolesForType = this.config.rolesByType[type]

    for (const role of roles) {
      relationsByRole[role] = rolesForType.has(role)
        ? this.relations.values()
        : []
    }

    const methodToRetrieveByName = (
      name: string
    ): { plays: Record<RoleKeys, Relation[]> } => ({
      plays: mob(
        relationsByRole,
        (relations: Relation[], role: RoleKeys): Relation[] =>
          relations.filter((r: Relation) =>
            r.members[role].some(({ id }) => id === name)
          )
      ),
    })

    return { named: methodToRetrieveByName }
  }

  public toJSON = (): RelationManagerJson<
    TypeKeys,
    RoleKeys,
    RelationProperties,
    RelationContribution,
    Relation
  > => ({
    config: this.config.toJSON(),
    relations: hamtToRecord(this.relations),
  })
}
