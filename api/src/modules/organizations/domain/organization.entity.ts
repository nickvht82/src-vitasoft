/**
 * Organization domain entity — a tenant.
 *
 * Pure TypeScript with zero framework or persistence dependencies. This is the
 * innermost layer of the Clean Architecture; nothing here imports NestJS, Prisma,
 * or HTTP concerns.
 */
export class Organization {
  private constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Rehydrate an entity from already-persisted values (e.g. a repository read).
   * Performs no validation — the data is trusted because it came from the store.
   */
  static fromPersistence(props: {
    id: string;
    slug: string;
    name: string;
    createdAt: Date;
  }): Organization {
    return new Organization(props.id, props.slug, props.name, props.createdAt);
  }
}
