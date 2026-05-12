import { GoLoginProvider } from './gologin.provider.js'
import { AdsPowerProvider } from './adspower.provider.js'
import { MultiloginProvider } from './multilogin.provider.js'
import { DolphinProvider } from './dolphin.provider.js'
import { NstbrowserProvider } from './nstbrowser.provider.js'

export class AntidetectProviderFactory {
  /**
   * Create provider instance dari type + credentials.
   * Credentials diambil dari DB integration record (sudah didekripsi).
   */
  static create(
    type: ProviderType,
    credentials: ProviderCredentials,
  ): IAntidetectProvider {
    switch (type) {
      case 'gologin':
        return new GoLoginProvider(credentials)

      case 'adspower':
        return new AdsPowerProvider(credentials)

      case 'multilogin':
        return new MultiloginProvider(credentials)

      case 'dolphin':
        return new DolphinProvider(credentials)

      case 'nstbrowser':
        return new NstbrowserProvider(credentials)

      default:
        throw new Error(`Unknown antidetect provider: ${type}`)
    }
  }

  /** List semua supported providers */
  static getSupportedProviders(): ProviderType[] {
    return ['gologin', 'adspower', 'multilogin', 'dolphin', 'nstbrowser']
  }

  /** Check apakah provider type valid */
  static isSupported(type: string): type is ProviderType {
    return this.getSupportedProviders().includes(type as ProviderType)
  }
}
