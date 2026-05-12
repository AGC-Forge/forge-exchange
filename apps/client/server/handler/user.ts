import { type H3Event } from "h3";
import {
  updateAvatarOnlySchema,
  updateProfileSchema,
  changePasswordSchema
} from "~~/server/utils/validate";

export const getUserHandler = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true,
        role: true,
      },
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User tidak ditemukan",
        data: {
          code: "USER_NOT_FOUND",
          message: "User tidak ditemukan",
        },
      });
    }

    return {
      ...user,
      subscription: user.subscription
        ? {
          ...user.subscription,
          creditBalance: Number(user.subscription.creditBalance),
          creditLimit: Number(user.subscription.creditLimit),
          creditUsed: Number(user.subscription.creditUsed),
        }
        : null,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const updateAvatarHandler = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);


    const body = updateAvatarOnlySchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid avatar URL",
        data: {
          code: "INVALID_AVATAR_URL",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarUrl: body.data.avatar,
      },
    });
    return {
      success: true,
      message: "Avatar updated successfully",
      data: {
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const updateProfileHandler = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const body = updateProfileSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid profile data",
        data: {
          code: "INVALID_PROFILE_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: body.data.name,
        avatarUrl: body.data.avatar,
      },
    });

    user.passwordHash = null;

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        ...user,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const changePasswordHandler = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const body = changePasswordSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid password data",
        data: {
          code: "INVALID_PASSWORD_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User tidak ditemukan",
        data: {
          code: "USER_NOT_FOUND",
          message: "User tidak ditemukan",
        },
      });
    }
    if (!user.passwordHash) {
      throw createError({
        statusCode: 400,
        message: "User tidak memiliki password hash",
        data: {
          code: "USER_NOT_HAS_PASSWORD_HASH",
          message: "User tidak memiliki password hash",
        },
      });
    }

    if (!await comparePassword(body.data.currentPassword, user.passwordHash)) {
      throw createError({
        statusCode: 400,
        message: "Current password is incorrect",
        data: {
          code: "CURRENT_PASSWORD_INCORRECT",
          message: "Current password is incorrect",
        },
      });
    }
    const password = await hashPassword(body.data.newPassword);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: password,
      },
    });
    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const deleteAccountHandler = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);

    const exist = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!exist) {
      throw createError({
        statusCode: 404,
        message: "User tidak ditemukan",
        data: {
          code: "USER_NOT_FOUND",
          message: "User tidak ditemukan",
        },
      });
    }

    if (!exist.isActive) {
      throw createError({
        statusCode: 400,
        message: "User tidak aktif",
        data: {
          code: "USER_NOT_ACTIVE",
          message: "User tidak aktif",
        },
      });
    }

    await prisma.user.delete({
      where: { id: session.user.id },
      include: {
        subscription: true,
        campaigns: true,
        accounts: true,
        proxyPools: true,
        fingerprints: true,
        integrations: true,
        creditLogs: true,
        topUpTransactions: true,
        sessions: true,
        systemLogs: true,
        auditLogs: true,
        passwordResetTokens: true,
      },
    });
    return {
      success: true,
      message: "Account deleted successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
