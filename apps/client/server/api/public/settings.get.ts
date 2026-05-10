import { getSetupConfig, getSettingAction } from "../../utils/setting";

export default defineEventHandler(async () => {
  const base = await getSetupConfig();

  return {
    ...base,
  };
});
