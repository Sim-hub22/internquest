export type ProfileCompletenessInput = {
  headline?: string;
  location?: string;
  education: unknown[];
  skills: unknown[];
  experience: unknown[];
  links: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
  preferredCategories?: string[];
  preferredLocationType?: string;
};

export function calculateProfileCompleteness(
  profile: ProfileCompletenessInput | null
) {
  if (!profile) {
    return 0;
  }

  const checkpoints = [
    Boolean(profile.headline),
    Boolean(profile.location),
    profile.education.length > 0,
    profile.skills.length > 0,
    profile.experience.length > 0,
    Boolean(
      profile.links.github || profile.links.linkedin || profile.links.portfolio
    ),
    Boolean(profile.preferredCategories?.length),
    Boolean(profile.preferredLocationType),
  ];

  const completed = checkpoints.filter(Boolean).length;
  return Math.round((completed / checkpoints.length) * 100);
}
