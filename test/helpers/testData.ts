import { faker } from "@faker-js/faker";

/**
 * Generates a valid username that meets our validation requirements
 */
export function generateValidUsername(): string {
  // Generate a username with letters, numbers, and underscores
  let username = faker.internet.username().replace(/[^a-zA-Z0-9_]/g, "");

  // Ensure it's at least 3 characters and no more than 30
  if (username.length < 3) {
    username = username + faker.string.alphanumeric(3 - username.length);
  }
  if (username.length > 30) {
    username = username.substring(0, 30);
  }

  return username;
}

/**
 * Generates a valid password that meets our validation requirements
 */
export function generateValidPassword(): string {
  // Create a password with at least one uppercase, one lowercase, one number
  const lower = faker.string.alpha({ length: 3, casing: "lower" });
  const upper = faker.string.alpha({ length: 2, casing: "upper" });
  const numbers = faker.string.numeric(2);
  const additional = faker.string.alphanumeric(3);

  // Shuffle the components
  const chars = (lower + upper + numbers + additional).split("");
  const shuffled = chars.sort(() => Math.random() - 0.5);

  return shuffled.join("");
}
