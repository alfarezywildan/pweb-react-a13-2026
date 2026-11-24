import type { MatchBadgeColor, SkillMatchResult } from '../types';

export function calculateSkillMatch(
  kaptenSkills: string[],
  requiredSkills: string[]
): SkillMatchResult {
  const normalizedKapten = new Set(
    kaptenSkills.map((skill) => skill.trim().toLowerCase()).filter(Boolean)
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of requiredSkills) {
    const trimmed = reqSkill.trim();
    if (!trimmed) continue;

    if (normalizedKapten.has(trimmed.toLowerCase())) {
      matchedSkills.push(trimmed);
    } else {
      missingSkills.push(trimmed);
    }
  }

  const totalRequired = matchedSkills.length + missingSkills.length;
  const score =
    totalRequired === 0
      ? 0
      : Math.round((matchedSkills.length / totalRequired) * 100);

  let badgeColor: MatchBadgeColor = 'red';
  if (score >= 70) {
    badgeColor = 'green';
  } else if (score >= 40) {
    badgeColor = 'yellow';
  }

  return {
    score,
    matchedSkills,
    missingSkills,
    badgeColor,
  };
}