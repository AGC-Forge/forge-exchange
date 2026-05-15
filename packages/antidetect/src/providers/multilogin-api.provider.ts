import { BaseAntidetectProvider } from './base.provider.js'
import type {
  ProviderCredentials,
  HealthCheckResult,
  AntidetectProfileConfig,
  AntidetectProfile,
  LaunchResult
} from '../types/index.js'

// export class MultiLoginApiProvider extends BaseAntidetectProvider {
//   readonly type = 'multilogin' as const

//   private readonly API_URL = 'https://launcher.mlx.yt:45001'
//   private accessToken: string | null = null
//   private tokenExpiry: number = 0
// }
