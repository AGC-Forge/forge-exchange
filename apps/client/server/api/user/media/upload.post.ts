import { readMultipartFormData } from "h3";

// export default defineEventHandler(async (event) => {
//   const session = await requireUserSession(event);
//   const userId = (session.user as any).id as string;

//   const parts = await readMultipartFormData(event);
//   if (!parts) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Invalid multipart form data",
//     });
//   }

//   const filePart = parts.find((p) => p.name === "file" && p.filename && p.data);
//   if (!filePart || !filePart.filename || !filePart.data) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "File is required",
//     });
//   }

//   const folderPart = parts.find((p) => p.name === "folder");
//   const messageIdPart = parts.find((p) => p.name === "message_id");

//   const folder = folderPart?.data
//     ? folderPart.data.toString("utf8").trim()
//     : undefined;
//   const message_id = messageIdPart?.data
//     ? messageIdPart.data.toString("utf8").trim()
//     : undefined;

//   const settings = await getSetupConfig();
//   const maxFileSize = buildMaxFileSizeFromSettings(settings);

//   const check = validateFile(
//     filePart.type || "application/octet-stream",
//     filePart.data.length,
//     filePart.filename,
//     maxFileSize,
//   );

//   if (!check.valid) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: check.error || "Invalid file",
//     });
//   }

//   const uploaded = await uploadToMinio({
//     userId,
//     originalFilename: filePart.filename,
//     mimeType: filePart.type || "application/octet-stream",
//     buffer: filePart.data,
//     folder,
//   });

//   let mediaId: string | undefined;
//   if (message_id) {
//     const media = await prisma.media.create({
//       data: {
//         message_id,
//         bucket: uploaded.bucket,
//         object_key: uploaded.object_key,
//         url: uploaded.url,
//         type: uploaded.type,
//         filename: uploaded.filename,
//         original_filename: uploaded.original_filename,
//         size: uploaded.size,
//         mime_type: uploaded.mime_type,
//       },
//       select: { id: true },
//     });
//     mediaId = media.id;
//   }

//   return {
//     file: uploaded,
//     mediaId,
//   };
// });
