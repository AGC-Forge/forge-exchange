import { getRouterParam } from "h3";

const publicKeys = new Set<string>([
  ...Object.keys(DEFAULTS_SETTINGS),
  "default_provider",
  "default_model_id",
]);

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "path") || "";
  const parts = raw.split("/").filter(Boolean);

  let group_name = "general";
  let key: string | undefined;

  if (parts.length === 1) {
    key = parts[0];
  } else if (parts.length === 2) {
    group_name = parts[0] ?? "general";
    key = parts[1];
  }

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: "Key is required",
    });
  }

  if (!publicKeys.has(key)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Setting not found",
    });
  }

  const valueFromDb = await getSettingAction(key, group_name);
  const value =
    valueFromDb ??
    (Object.prototype.hasOwnProperty.call(DEFAULTS_SETTINGS, key)
      ? String((DEFAULTS_SETTINGS as any)[key] ?? "")
      : null);

  return { key, group_name, value };
});
