// Replace these editorial defaults with the site owner's own biography and links.
// Empty links/projects are intentional: never publish invented identities or URLs.
export const profile = {
  name: 'PLAYER ONE',
  title: 'A world of my own',
  introduction: 'Welcome to my little corner of the overworld.',
  biography: 'This world is still being written. Explore the sections to learn more about the player behind it.',
  location: 'The Overworld',
  status: 'Exploring',
  interests: ['Building', 'Exploring', 'Creating'],
  achievements: [] as { title: string; description: string }[]
};
export const hobbies = [] as { icon: string; title: string; description: string; detail?: string }[];
export const projects = [] as { title: string; description: string; image?: string; category: string; url?: string }[];
export const socials = [] as { platform: string; username: string; url: string; icon: string }[];