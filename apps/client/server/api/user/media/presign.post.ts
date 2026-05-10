import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";

const schema = z.object({
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  folder: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = (session.user as any).id as string;

  const body = schema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid input" });
  }

  const settings = await getSetupConfig();
  const maxFileSize = buildMaxFileSizeFromSettings(settings);

  const check = validateFile(
    body.data.mimeType,
    body.data.size,
    body.data.originalFilename,
    maxFileSize,
  );
  if (!check.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: check.error || "Invalid file",
    });
  }

  const ext = path.extname(body.data.originalFilename).toLowerCase();
  const folder = body.data.folder || "uploads";
  const filename = `${randomUUID()}${ext}`;
  const object_key = `${folder}/${userId}/${filename}`;

  const uploadUrl = await getPresignedUploadUrl(object_key);
  const url = buildPublicUrl(object_key);

  return {
    bucket: MINIO_BUCKET,
    object_key,
    uploadUrl,
    url,
    filename,
    original_filename: body.data.originalFilename,
    mime_type: body.data.mimeType,
    size: body.data.size,
  };
});
