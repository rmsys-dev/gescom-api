export type AccessTokenClaims = {
  sub: string;
  sid: string;
  ent?: string;
  enterpriseId?: string;
  mem?: string;
  mdep?: string;
};

export type RefreshTokenClaims = {
  sub: string;
  sid: string;
  jti: string;
  ent?: string;
  enterpriseId?: string;
};

export type AuthContext = {
  userId: string;
  sessionId: string;
  enterpriseId?: string;
  memberId?: string;
  memberDepartmentId?: string;
};
