import { getSetupConfig, getSettingAction } from "../../utils/setting";

export default defineEventHandler(async () => {
  const base = await getSetupConfig();

  const [default_provider, default_model_id] = await Promise.all([
    getSettingAction("default_provider", "ai"),
    getSettingAction("default_model_id", "ai"),
  ]);

  return {
    ...base,
    default_provider,
    default_model_id,
  };
});

