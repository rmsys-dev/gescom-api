import { eq } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { userSessions } from "../../db/schema.js";
import { createSession } from "./repository.js";
import { hashRefreshToken, newJti, refreshTokenExpiresAt, signAccessToken, signRefreshToken, } from "./tokens.js";
const updateSessionRefreshHash = async (sessionId, hash, executor = db) => {
    const now = new Date();
    await executor
        .update(userSessions)
        .set({ refreshTokenHash: hash, updatedAt: now })
        .where(eq(userSessions.id, sessionId));
};
export const issueSessionTokens = async (input, executor = db) => {
    const jti = newJti();
    const session = await createSession({
        userId: input.userId,
        memberId: input.memberId ?? null,
        jti,
        refreshTokenHash: "pending",
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: refreshTokenExpiresAt(),
    }, executor);
    const refreshToken = signRefreshToken({
        sub: input.userId,
        sid: session.id,
        jti,
        ent: input.enterpriseId ?? undefined,
        enterpriseId: input.enterpriseId ?? undefined,
    });
    await updateSessionRefreshHash(session.id, hashRefreshToken(refreshToken), executor);
    const accessToken = signAccessToken({
        sub: input.userId,
        sid: session.id,
        ent: input.enterpriseId ?? undefined,
        enterpriseId: input.enterpriseId ?? undefined,
        mem: input.memberId ?? undefined,
    });
    return { sessionId: session.id, accessToken, refreshToken };
};
