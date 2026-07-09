import { ownerGroups, owners, ownersByRole, roles, type Role, type TeamMember } from "@/types/task";

const roleByOwner = new Map<string, Role>();

for (const role of roles) {
  for (const owner of ownersByRole[role]) {
    if (!roleByOwner.has(owner)) roleByOwner.set(owner, role);
  }
}

export const defaultTeamMembers: TeamMember[] = owners.map((memberCode) => ({
  member_code: memberCode,
  display_name: null,
  role_group: roleByOwner.get(memberCode) || "项目协同",
  email: null,
  is_active: true,
}));

export function createMemberMap(members: TeamMember[]) {
  return new Map(members.map((member) => [member.member_code, member]));
}

export function formatMemberName(memberCode: string, memberMap: Map<string, TeamMember>) {
  const member = memberMap.get(memberCode);
  const displayName = member?.display_name?.trim();
  return displayName ? `${displayName}（${memberCode}）` : memberCode;
}

export function getMembersByGroup(members: TeamMember[]) {
  const memberMap = createMemberMap(members);
  return ownerGroups.map((group) => ({
    ...group,
    members: group.owners.map((owner) => memberMap.get(owner) || defaultTeamMembers.find((member) => member.member_code === owner)).filter(Boolean) as TeamMember[],
  }));
}
