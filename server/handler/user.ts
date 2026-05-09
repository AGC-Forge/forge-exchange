import { type H3Event, H3Error } from "h3";
import { z } from "zod";

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
