import { type H3Event } from "h3";

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
        message: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }
    if (!user.passwordHash) {
      throw createError({
        statusCode: 400,
        message: "User doesn't have password hash",
        data: {
          code: "USER_NOT_HAS_PASSWORD_HASH",
          message: "User doesn't have password hash",
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
    const newHash = await generateHashPassword(body.data.newPassword);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newHash,
      },
    });

    const config = useRuntimeConfig()
    const { clientIp, userAgent, locationClient } = await getAllHeaderIdentifiers(event);
    try {
      sendPasswordResetSuccessEmail(user, config.public.PUBLIC_SITE_URL)
      sendSuspiciousActivityEmail(user, {
        type: "change_password",
        ip: clientIp,
        userAgent,
        location: locationClient,
        timestamp: new Date(),
        secureUrl: "/login",
      }, config.public.PUBLIC_SITE_URL)
    } catch (error) {
      console.error(error);
    }
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
        message: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    if (!exist.isActive) {
      throw createError({
        statusCode: 400,
        message: "User is not active",
        data: {
          code: "USER_NOT_ACTIVE",
          message: "User not active",
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

    const config = useRuntimeConfig()

    try {
      await sendAccountDeletingRequestEmail(exist, config.public.PUBLIC_SITE_URL)
    } catch (error) {
      console.error(error);
    }
    return {
      success: true,
      message: "Account deleted successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const listUser = async (event: H3Event) => {
  try {

    await requireAdmin(event)

    const rawQuery = getQuery(event)
    const query = listUserQuerySchema.parse({
      page: rawQuery.page,
      limit: rawQuery.limit,
      status: rawQuery.status,
      search: rawQuery.search,
      orderBy: rawQuery.orderBy,
      order: rawQuery.order,
      role: rawQuery.role,
    })
    const skip = (query.page - 1) * query.limit

    const where: any = {
      deletedAt: null,
    }

    if (query.status) where.isActive = query.status === 'active' ? true : false
    if (query.role) where.role = {
      name: query.role,
    }
    if (query.search) where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ]

    const orderBy: any = { [query.orderBy || 'id']: query.order };

    const [users, total] = await Promise.all([
      await prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          subscription: true,
          role: true,
          campaigns: true,
        },
      }),
      await prisma.user.count({
        where,
      }),
    ])

    // Convert BigInt fields to Number for JSON serialization
    const serializedUsers = users.map((user) => ({
      ...user,
      subscription: user.subscription ? {
        ...user.subscription,
        creditBalance: Number(user.subscription.creditBalance),
        creditLimit: Number(user.subscription.creditLimit),
        creditUsed: Number(user.subscription.creditUsed),
      } : null,
      campaigns: user.campaigns.map((campaign) => ({
        ...campaign,
      })),
    }));

    return {
      success: true,
      message: "Users listed successfully",
      data: serializedUsers,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const assignRoleHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)
    const userSession = await getUserSession(event);

    const userId = getRouterParam(event, "id")!;
    if (userId === userSession?.user?.id) {
      throw createError({
        statusCode: 400,
        message: "You can't assign role to yourself",
        data: {
          code: "CANNOT_ASSIGN_ROLE_TO_SELF",
          message: "You can't assign role to yourself",
        },
      });
    }

    const body = assignRoleSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid role data",
        data: {
          code: "INVALID_ROLE_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) {
      throw createError({
        statusCode: 404,
        message: "User not found or inactive status",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found or inactive status",
        },
      });
    }

    const role = await prisma.role.findFirst({
      where: { name: body.data.role },
    });
    if (!role) {
      throw createError({
        statusCode: 404,
        message: "Role not found",
        data: {
          code: "ROLE_NOT_FOUND",
          message: "Role not found",
        },
      });
    }

    if (user.role_id === role.id) {
      throw createError({
        statusCode: 400,
        message: "User already has this role",
        data: {
          code: "USER_ALREADY_HAS_ROLE",
          message: "User already has this role",
        },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role_id: role.id,
      },
    });

    return {
      success: true,
      message: "Role assigned successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const setStatusActiveHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)
    const userSession = await getUserSession(event);

    const userId = getRouterParam(event, "id")!;
    if (userId === userSession?.user?.id) {
      throw createError({
        statusCode: 400,
        message: "You can't set active status to yourself",
        data: {
          code: "CANNOT_SET_ACTIVE_STATUS_TO_SELF",
          message: "You can't set active status to yourself",
        },
      });
    }

    const body = setStatusActiveSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid active data",
        data: {
          code: "INVALID_ACTIVE_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: body.data.status === 'active' ? true : false,
      },
    });

    const config = useRuntimeConfig()

    if (body.data.status === 'inactive') {
      try {
        await sendSuspendAccountEmail(user, config.public.PUBLIC_SITE_URL);
      } catch (error) {
        console.error(error)
      }
    }

    return {
      success: true,
      message: "Set active user status successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
}
export const deleteUserHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)
    const userSession = await getUserSession(event);

    const userId = getRouterParam(event, "id")!;
    if (userId === userSession?.user?.id) {
      throw createError({
        statusCode: 400,
        message: "You can't delete yourself",
        data: {
          code: "CANNOT_DELETE_SELF",
          message: "You can't delete yourself",
        },
      });
    }

    await prisma.user.delete({
      where: { id: userId },
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

    const config = useRuntimeConfig()

    try {
      if (userSession.user) {
        await sendPermanentlyDeleteAccountEmail(userSession.user, config.public.PUBLIC_SITE_URL)
      }
    } catch (error) {
      console.error(error);
    }

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
}
export const inviteUserHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const body = inviteUserSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid invite data",
        data: {
          code: "INVALID_INVITE_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }
    const existUser = await prisma.user.findUnique({
      where: { email: body.data.email },
    });

    if (existUser) {
      throw createError({
        statusCode: 404,
        message: "User already exists",
        data: {
          code: "USER_ALREADY_EXISTS",
          message: "User already exists",
        },
      });
    }

    const existRole = await prisma.role.findFirst({
      where: { name: "user" },
    });

    if (!existRole) {
      throw createError({
        statusCode: 404,
        message: "Role not found",
        data: {
          code: "ROLE_NOT_FOUND",
          message: "Role not found",
        },
      });
    }

    const ip = getClientIp(event);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: body.data.email,
          passwordHash: await generateHashPassword(body.data.password),
          name: body.data.name,
          timezone: getTimezone(event).timezone,
          role_id: existRole.id,
          isActive: body.data.isActive,
          emailVerified: body.data.emailVerified,
        },
      });

      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: body.data.plan,
          creditLimit: BigInt(body.data.creditLimit),
          creditBalance: BigInt(body.data.creditBalance),
          creditUsed: BigInt(0),
          expiredAt: body.data.expiredAt,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "invite_user",
          resource: "user",
          resourceId: newUser.id,
          ipAddress: ip,
          userAgent: getHeader(event, "user-agent") || null,
        },
      });

      return newUser;
    });

    const config = useRuntimeConfig()
    try {
      await sendIviteUserEmail(
        user,
        config.public.PUBLIC_SITE_URL,
        body.data.password,
        config.public.SUPPORT_EMAIL
      );
    } catch (err) {
      console.error(err)
    }

    return {
      success: true,
      message: "User invited successfully",
      user,
    }

  } catch (err) {
    throw handleRequestError(err);
  }
}
export const getUserByIdHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const userId = getRouterParam(event, "id")!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return {
      success: true,
      message: "User fetched successfully",
      user: {
        ...user,
        subscription: user.subscription ? {
          ...user.subscription,
          creditBalance: Number(user.subscription.creditBalance),
          creditLimit: Number(user.subscription.creditLimit),
          creditUsed: Number(user.subscription.creditUsed),
        } : null,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
}
export const updateUserByIDHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const userId = getRouterParam(event, "id")!;

    const existUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!existUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }
    if (!existUser.isActive) {
      throw createError({
        statusCode: 400,
        message: "User is not active",
        data: {
          code: "USER_IS_NOT_ACTIVE",
          message: "User is not active",
        },
      });
    }

    const body = updateUserSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: "Invalid update data",
        data: {
          code: "INVALID_UPDATE_DATA",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const email = body.data.email || existUser.email;
    let plan = existUser.subscription?.plan;
    let creditLimit = existUser.subscription?.creditLimit;
    let creditBalance = existUser.subscription?.creditBalance;
    let creditUsed = existUser.subscription?.creditUsed;
    let expiredAt = existUser.subscription?.expiredAt;

    if (body.data.plan) {
      plan = body.data.plan;
    }
    if (body.data.creditLimit) {
      creditLimit = BigInt(body.data.creditLimit);
    }
    if (body.data.creditBalance) {
      creditBalance = BigInt(body.data.creditBalance);
    }
    if (body.data.creditUsed) {
      creditUsed = BigInt(body.data.creditUsed);
    }
    if (body.data.expiredAt) {
      expiredAt = body.data.expiredAt;
    }

    // Convert BigInt to Number for JSON serialization
    const normalizedCreditLimit = typeof creditLimit === 'bigint' ? Number(creditLimit) : creditLimit;
    const normalizedCreditBalance = typeof creditBalance === 'bigint' ? Number(creditBalance) : creditBalance;
    const normalizedCreditUsed = typeof creditUsed === 'bigint' ? Number(creditUsed) : creditUsed;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.update({
        where: { id: userId },
        data: {
          name: body.data.name,
          email,
          isActive: body.data.isActive,
          emailVerified: body.data.emailVerified,
        },
      });

      const updatedSubscription = await tx.subscription.update({
        where: { userId: newUser.id },
        data: {
          plan,
          creditLimit: normalizedCreditLimit,
          creditBalance: normalizedCreditBalance,
          creditUsed: normalizedCreditUsed,
          isActive: body.data.isActiveSubscription,
          expiredAt,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "update_user",
          resource: "user",
          resourceId: newUser.id,
          userAgent: getHeader(event, "user-agent") || null,
        },
      });

      return {
        user: newUser,
        subscription: {
          ...updatedSubscription,
          creditLimit: Number(updatedSubscription.creditLimit),
          creditBalance: Number(updatedSubscription.creditBalance),
          creditUsed: Number(updatedSubscription.creditUsed),
        },
      };
    });

    return {
      success: true,
      message: "User updated successfully",
      user: {
        ...user.user,
        subscription: user.subscription,
      },
    }

  } catch (err) {
    throw handleRequestError(err);
  }
}
export const bulkDeleteUserHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const body = await readBody(event);
    if (!body) {
      throw createError({
        statusCode: 400,
        message: "Invalid delete data",
        data: {
          code: "INVALID_DELETE_DATA",
          message: "Invalid delete data",
        },
      });
    }
    if (!Array.isArray(body.userIds)) {
      throw createError({
        statusCode: 400,
        message: "Invalid delete data",
        data: {
          code: "INVALID_DELETE_DATA",
          message: "Invalid delete data",
        },
      });
    }
    const userIds = body.userIds as string[];

    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    return {
      success: true,
      message: "Users deleted successfully",
    }
  } catch (err) {
    throw handleRequestError(err);
  }
}
export const cleanUpUserHandler = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    await prisma.user.deleteMany({
      where: {
        deletedAt: {
          not: null,
        },
      },
    });

    return {
      success: true,
      message: "Users cleaned up successfully",
    }
  } catch (err) {
    throw handleRequestError(err);
  }
}
