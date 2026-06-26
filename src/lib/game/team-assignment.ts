type TeamCapacity = {
  id: string;
  memberCount: number;
  maxMembers: number;
};

export function findTeamForNewParticipant(teams: TeamCapacity[]) {
  const availableTeams = teams.filter(
    (team) => team.memberCount < team.maxMembers,
  );

  if (availableTeams.length === 0) {
    return null;
  }

  const lowestMemberCount = Math.min(
    ...availableTeams.map((team) => team.memberCount),
  );
  const lightestTeams = availableTeams.filter(
    (team) => team.memberCount === lowestMemberCount,
  );
  const randomIndex = Math.floor(Math.random() * lightestTeams.length);

  return lightestTeams[randomIndex] ?? null;
}

export function isRoomFull(teams: TeamCapacity[]) {
  return teams.every((team) => team.memberCount >= team.maxMembers);
}
