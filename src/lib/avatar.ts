const API_HOST = "https://sehitumitkestitarimmtal.com";

// Yeni varsayılan profil resmi (sunucuda barındırılan)
export const DEFAULT_AVATAR =
  "https://sehitumitkestitarimmtal.com/varsay%C4%B1lan.jpeg";

/**
 * Returns the user's profile picture if it exists,
 * otherwise the shared default avatar URL.
 */
export function avatarUrl(profilePic?: string | null): string {
  if (!profilePic) return DEFAULT_AVATAR;
  if (profilePic.startsWith("http")) return profilePic;
  return `${API_HOST}${profilePic}`;
}
