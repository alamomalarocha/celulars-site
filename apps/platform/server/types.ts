export interface Principal {
  readonly sessionId: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly companyId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly csrfToken: string;
  readonly rotatedToken?: string;
}
