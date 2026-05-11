import { getSetupConfig, getSettingAction } from "../../utils/setting";

export default defineEventHandler(async (event) => {
  const base = await getSetupConfig();

  event.context.settings = base;

  return {
    ...base,
  };
});
