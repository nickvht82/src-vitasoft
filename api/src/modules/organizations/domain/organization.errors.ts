/**
 * Raised when creating an organization whose slug is already taken.
 * The presentation layer maps this to HTTP 409.
 */
export class OrganizationSlugTakenError extends Error {
  constructor(public readonly slug: string) {
    super(`Organization slug "${slug}" is already taken.`);
    this.name = "OrganizationSlugTakenError";
  }
}

/**
 * Raised when a requested organization does not exist.
 * The presentation layer maps this to HTTP 404.
 */
export class OrganizationNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Organization "${id}" not found.`);
    this.name = "OrganizationNotFoundError";
  }
}
