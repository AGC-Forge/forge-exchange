// ============================================================
// WebRTC Proper Spoofer — stealth/webrtc-spoofer.ts
// Phase 3C: Full WebRTC IP leak prevention + proper spoofing
// ============================================================
//
// Masalah WebRTC yang harus ditangani:
//   1. IP leak via STUN (ICE host candidate expose real IP)
//   2. mDNS leak (.local hostname masih bisa leak di beberapa OS)
//   3. SDP (Session Description Protocol) berisi IP real
//   4. enumerateDevices() bisa expose info hardware nyata
//   5. RTCPeerConnection masih bisa di-construct tanpa config
//
// Strategy:
//   - Mode BLOCK   : disable WebRTC sepenuhnya (paling aman)
//   - Mode SPOOF   : ganti semua IP dengan proxy/fake IP (recommended)
//   - Mode RESTRICT: hanya izinkan relay candidate (TURN only)
// ============================================================

import type { BrowserContext } from 'playwright'
import type {
  ConsistentProfile,
  WebRTCSpoofOptions,
} from '@forge-exchange/worker-kit'
import type { WorkerLogger } from '../utils/logger.js'


const DEFAULT_OPTS: WebRTCSpoofOptions = {
  mode: 'spoof',
  spoofedIp: undefined,
  fakePublicIp: undefined,
}

export class WebRTCSpoofer {
  private logger: WorkerLogger

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  // ── Apply ke browser context ──────────────────────────────
  async applyToContext(
    context: BrowserContext,
    profile: ConsistentProfile,
    opts: WebRTCSpoofOptions = DEFAULT_OPTS,
  ): Promise<void> {
    const { mode } = opts

    // Pilih IP untuk spoof: proxy IP > fake IP > generate random
    const targetIp = opts.spoofedIp
      ?? opts.fakePublicIp
      ?? this.generateFakePublicIp()

    this.logger.info('WebRTCSpoofer: applying', {
      mode,
      targetIp,
      os: profile.os,
      browser: profile.browser,
    })

    switch (mode) {
      case 'block':
        await this.applyBlock(context)
        break
      case 'restrict':
        await this.applyRestrict(context)
        break
      case 'spoof':
      default:
        await this.applySpoof(context, targetIp, profile)
        break
    }
  }

  // ─────────────────────────────────────────────────────────
  // MODE: BLOCK — disable WebRTC sepenuhnya
  // Cocok untuk: session yang tidak butuh video/audio call
  // ─────────────────────────────────────────────────────────
  private async applyBlock(context: BrowserContext): Promise<void> {
    await context.addInitScript(`
      (() => {
        // Hapus semua WebRTC API
        const rtcAPIs = [
          'RTCPeerConnection',
          'webkitRTCPeerConnection',
          'mozRTCPeerConnection',
          'RTCIceCandidate',
          'RTCSessionDescription',
          'RTCDataChannel',
        ];

        rtcAPIs.forEach(api => {
          try {
            Object.defineProperty(window, api, {
              get: () => undefined,
              set: () => {},
              configurable: true,
            });
          } catch { /* some might not exist */ }
        });

        // Juga block navigator.mediaDevices
        if (navigator.mediaDevices) {
          Object.defineProperty(navigator, 'mediaDevices', {
            get: () => ({
              getUserMedia:    () => Promise.reject(new DOMException('NotAllowedError')),
              getDisplayMedia: () => Promise.reject(new DOMException('NotAllowedError')),
              enumerateDevices: () => Promise.resolve([]),
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false,
            }),
            configurable: true,
          });
        }
      })();
    `)
  }

  // ─────────────────────────────────────────────────────────
  // MODE: RESTRICT — hanya relay (TURN) candidate yang lolos
  // ICE host & srflx candidates diblock → tidak ada IP leak
  // Tapi WebRTC masih bisa berfungsi jika ada TURN server
  // ─────────────────────────────────────────────────────────
  private async applyRestrict(context: BrowserContext): Promise<void> {
    await context.addInitScript(`
      (() => {
        const OrigRTC = window.RTCPeerConnection;
        if (!OrigRTC) return;

        class RestrictedRTC extends OrigRTC {
          constructor(config) {
            // Force hanya relay — tidak ada STUN
            const restrictedConfig = {
              ...config,
              iceTransportPolicy: 'relay',
              iceServers: (config?.iceServers ?? []).filter(s => {
                const urls = Array.isArray(s.urls) ? s.urls : [s.urls ?? ''];
                // Hanya izinkan TURN server, skip STUN
                return urls.some(u => u.startsWith('turn:') || u.startsWith('turns:'));
              }),
            };
            super(restrictedConfig);
          }

          // Intercept addIceCandidate — filter host & srflx candidates
          addIceCandidate(candidate) {
            if (candidate?.candidate) {
              const c = candidate.candidate;
              // Block host candidates (expose LAN IP) dan srflx (expose real public IP)
              if (c.includes(' host ') || c.includes(' srflx ')) {
                return Promise.resolve(); // silently drop
              }
            }
            return super.addIceCandidate(candidate);
          }
        }

        // Patch static method
        RestrictedRTC.generateCertificate = OrigRTC.generateCertificate?.bind(OrigRTC);

        window.RTCPeerConnection       = RestrictedRTC;
        window.webkitRTCPeerConnection = RestrictedRTC;
      })();
    `)
  }

  // ─────────────────────────────────────────────────────────
  // MODE: SPOOF — replace IP nyata dengan IP spoofed
  // Paling natural: WebRTC tetap berfungsi, IP diganti
  // ─────────────────────────────────────────────────────────
  private async applySpoof(
    context: BrowserContext,
    spoofedIp: string,
    profile: ConsistentProfile,
  ): Promise<void> {
    // Bangun fake device list sesuai OS
    const fakeDevices = this.buildFakeDeviceList(profile)
    const fakeMdnsHostname = this.generateFakeMdnsHostname()

    await context.addInitScript(`
      (() => {
        const SPOOFED_IP      = '${spoofedIp}';
        const FAKE_MDNS_HOST  = '${fakeMdnsHostname}';
        const FAKE_DEVICES    = ${JSON.stringify(fakeDevices)};

        // ── Helper: replace IP di SDP string ─────────────
        function patchSDP(sdp) {
          if (!sdp) return sdp;

          return sdp
            // Ganti semua IPv4 private/host candidates
            .replace(
              /a=candidate:[^\\r\\n]+ (host|srflx) [^\\r\\n]+\\r?\\n?/g,
              (match) => {
                // Replace IP address dalam candidate line
                return match.replace(
                  /(\\d{1,3}\\.){3}\\d{1,3}/g,
                  SPOOFED_IP
                );
              }
            )
            // Ganti mDNS .local hostname
            .replace(
              /[a-f0-9-]{8,}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\\.local/g,
              FAKE_MDNS_HOST
            )
            // Ganti IP di c= line (connection data)
            .replace(
              /c=IN IP4 (\\d{1,3}\\.){3}\\d{1,3}/g,
              'c=IN IP4 ' + SPOOFED_IP
            )
            // Ganti IP di o= line (origin)
            .replace(
              /o=([^\\s]+) (\\d+) (\\d+) IN IP4 (\\d{1,3}\\.){3}\\d{1,3}/g,
              (m, user, s1, s2) => 'o=' + user + ' ' + s1 + ' ' + s2 + ' IN IP4 ' + SPOOFED_IP
            );
        }

        // ── Helper: patch RTCSessionDescriptionInit ───────
        function patchSessionDesc(desc) {
          if (!desc || !desc.sdp) return desc;
          return { ...desc, sdp: patchSDP(desc.sdp) };
        }

        // ── Patch RTCPeerConnection ───────────────────────
        const OrigRTC = window.RTCPeerConnection;
        if (!OrigRTC) return;

        class SpoofedRTC extends OrigRTC {
          constructor(config) {
            // Strip STUN servers — kita handle sending lewat SDP patch
            const cleanConfig = {
              ...config,
              iceServers: (config?.iceServers ?? []).filter(s => {
                const urls = Array.isArray(s.urls) ? s.urls : [s.urls ?? ''];
                return !urls.some(u => u.startsWith('stun:'));
              }),
            };
            super(cleanConfig);
          }

          // ── Intercept createOffer ─────────────────────
          async createOffer(optionsOrConstraints) {
            const offer = await super.createOffer(optionsOrConstraints);
            return patchSessionDesc(offer);
          }

          // ── Intercept createAnswer ────────────────────
          async createAnswer(optionsOrConstraints) {
            const answer = await super.createAnswer(optionsOrConstraints);
            return patchSessionDesc(answer);
          }

          // ── Intercept setLocalDescription ────────────
          async setLocalDescription(desc) {
            return super.setLocalDescription(patchSessionDesc(desc));
          }

          // ── Intercept addIceCandidate ─────────────────
          // Patch incoming candidates dari remote peer
          async addIceCandidate(candidate) {
            if (candidate?.candidate) {
              const patched = {
                ...candidate,
                candidate: candidate.candidate
                  .replace(/(\\d{1,3}\\.){3}\\d{1,3}/g, SPOOFED_IP)
                  .replace(
                    /[a-f0-9-]{8,}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\\.local/g,
                    FAKE_MDNS_HOST
                  ),
              };
              return super.addIceCandidate(patched);
            }
            return super.addIceCandidate(candidate);
          }
        }

        // Copy static methods
        SpoofedRTC.generateCertificate = OrigRTC.generateCertificate?.bind(OrigRTC);

        window.RTCPeerConnection       = SpoofedRTC;
        window.webkitRTCPeerConnection = SpoofedRTC;

        // ── Patch onicecandidate event ────────────────────
        // Beberapa situs listen langsung ke event ini
        const origAddEventListener = window.RTCPeerConnection.prototype.addEventListener;
        window.RTCPeerConnection.prototype.addEventListener = function(type, handler, opts) {
          if (type === 'icecandidate' && typeof handler === 'function') {
            const wrappedHandler = (event) => {
              if (event?.candidate?.candidate) {
                const patchedCandidate = new RTCIceCandidate({
                  ...event.candidate,
                  candidate: event.candidate.candidate
                    .replace(/(\\d{1,3}\\.){3}\\d{1,3}/g, SPOOFED_IP)
                    .replace(
                      /[a-f0-9-]{8,}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\\.local/g,
                      FAKE_MDNS_HOST
                    ),
                });
                const patchedEvent = new RTCPeerConnectionIceEvent('icecandidate', {
                  candidate: patchedCandidate,
                });
                handler.call(this, patchedEvent);
                return;
              }
              handler.call(this, event);
            };
            return origAddEventListener.call(this, type, wrappedHandler, opts);
          }
          return origAddEventListener.call(this, type, handler, opts);
        };

        // ── Spoof enumerateDevices ────────────────────────
        if (navigator.mediaDevices?.enumerateDevices) {
          const origEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
          navigator.mediaDevices.enumerateDevices = async () => {
            // Return fake device list sesuai OS — jangan expose hardware nyata
            return FAKE_DEVICES;
          };
        }

        // ── Spoof getUserMedia ─────────────────────────────
        // Jangan expose info device nyata via getUserMedia error messages
        if (navigator.mediaDevices?.getUserMedia) {
          const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = (constraints) => {
            // Izinkan request tapi tidak return stream nyata dari hardware
            return origGUM(constraints).catch(() => {
              return Promise.reject(new DOMException('NotAllowedError', 'Permission denied'));
            });
          };
        }
      })();
    `)
  }

  // ── Build fake device list sesuai OS/browser ──────────────
  private buildFakeDeviceList(profile: ConsistentProfile): MediaDeviceInfo[] {
    // Desktop OS: biasanya ada 1 audio input, 1 audio output
    // Mobile: sama tapi dengan label berbeda
    const isMobile = ['android', 'ios'].includes(profile.os)

    const devices: Partial<MediaDeviceInfo>[] = [
      {
        deviceId: this.randomDeviceId(),
        groupId: this.randomDeviceId(),
        kind: 'audioinput',
        label: isMobile ? 'Default' : 'Default - Microphone (Realtek Audio)',
      },
      {
        deviceId: 'default',
        groupId: this.randomDeviceId(),
        kind: 'audiooutput',
        label: isMobile ? 'Default' : 'Default - Speakers (Realtek Audio)',
      },
      // Sengaja tidak include videoinput → banyak real user juga tidak punya webcam
    ]

    // macOS punya nama device lebih spesifik
    if (profile.os === 'macos') {
      // @ts-ignore
      devices[0].label = 'MacBook Pro Microphone'
      // @ts-ignore
      devices[1].label = 'MacBook Pro Speakers'
    }

    return devices as MediaDeviceInfo[]
  }

  // ── Generate fake public IP (realistic range) ─────────────
  generateFakePublicIp(): string {
    // Gunakan range IP residential yang umum
    const ranges = [
      // Comcast
      () => `73.${r(1, 254)}.${r(1, 254)}.${r(1, 254)}`,
      // AT&T
      () => `12.${r(1, 254)}.${r(1, 254)}.${r(1, 254)}`,
      // Verizon
      () => `71.${r(1, 254)}.${r(1, 254)}.${r(1, 254)}`,
      // Charter/Spectrum
      () => `98.${r(1, 254)}.${r(1, 254)}.${r(1, 254)}`,
    ]
    function r(min: number, max: number) {
      return Math.floor(min + Math.random() * (max - min))
    }
    const fn = ranges[Math.floor(Math.random() * ranges.length)];
    return fn ? fn() : '73.1.1.1';
  }

  // ── Generate fake mDNS hostname ───────────────────────────
  private generateFakeMdnsHostname(): string {
    const hex = () => Math.random().toString(16).slice(2, 10)
    return `${hex()}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex().slice(0, 4)}-${hex()}.local`
  }

  // ── Generate random device ID ─────────────────────────────
  private randomDeviceId(): string {
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }
}

// ── Singleton factory ─────────────────────────────────────────
export function createWebRTCSpoofer(logger: WorkerLogger): WebRTCSpoofer {
  return new WebRTCSpoofer(logger)
}
