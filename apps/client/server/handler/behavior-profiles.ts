import { tryCatch } from "bullmq";
import { type H3Event, H3Error } from "h3";

export const listBehaviorProfiles = async (event: H3Event) => {
  try {
    await requireUserSession(event);

    const profiles = await prisma.behaviorProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isDefault: true,
        mouseMovement: true,
        mouseSpeed: true,
        scrollEnabled: true,
        scrollDepth: true,
        internalLinkClick: true,
        linkClickRate: true,
        idlePauseEnabled: true,
        tabSwitching: true,
        keyboardTyping: true,
        customClickEnabled: true,
        customClickTargets: true,
        customClickOrder: true,
        customClickMaxPerSession: true,
        readingSpeed: true,
        attentionSpan: true,
      },
    });

    return { success: true, message: "OK", data: profiles };
  } catch (error) {
    throw handleRequestError(error);
  }
};
