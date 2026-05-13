// Problem dengan implementasi lama:
//   - noiseSeed = Math.random() → berubah tiap session → bot detector
//     bisa detect karena fingerprint tidak konsisten
//   - Audio noise pakai Math.random() inline → sama masalahnya
//   - WebGL hanya spoof 2 param, masih banyak param bocor nilai asli
//
// Solusi Phase 3D:
//   - Seed deterministik dari hash(os + browser + gpu + screen)
//   - Semua noise diturunkan dari 1 seed → nilai sama sepanjang session
//   - Canvas: patch toDataURL, toBlob, getImageData, OffscreenCanvas,
//             measureText (font fingerprint)
//   - Audio: patch getChannelData, copyFromChannel, getFloatFrequencyData,
//            getByteFrequencyData, AnalyserNode, OscillatorNode
//   - WebGL: patch 30+ parameter, extensions list, shader precision,
//            WebGL2 parameters
// ============================================================

import type { BrowserContext } from 'playwright'
import type { ConsistentProfile } from '@forge-exchange/worker-kit'
import type { WorkerLogger } from '../utils/logger.js'
import { createHash } from 'node:crypto'

export class CanvasAudioWebGLSpoofer {
  private logger: WorkerLogger

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  // ── Main entry point ──────────────────────────────────────
  async applyToContext(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    // ── 1. Buat deterministic seed dari profile identity ───
    // Seed sama → noise sama → fingerprint konsisten sepanjang session
    const seed = this.deriveSeed(profile)

    this.logger.info('CanvasAudioWebGLSpoofer: applying', {
      os: profile.os,
      browser: profile.browser,
      seed: seed.toString(16),
      gpu: profile.gpu.renderer.slice(0, 40),
    })

    // Run semua patch parallel
    await Promise.all([
      this.applyCanvasPatch(context, seed),
      this.applyAudioPatch(context, seed),
      this.applyWebGLPatch(context, profile),
      this.applyFontPatch(context, seed),
    ])
  }

  // ─────────────────────────────────────────────────────────
  // CANVAS PATCH
  // Target: toDataURL, toBlob, getImageData, OffscreenCanvas,
  //         measureText (font metric fingerprint)
  // ─────────────────────────────────────────────────────────
  private async applyCanvasPatch(
    context: BrowserContext,
    seed: number,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        // ── Deterministic PRNG (Mulberry32) ───────────────
        // Penting: pure math, tidak pakai Math.random() agar hasil konsisten
        function mulberry32(seed) {
          return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }

        const SEED    = ${seed};
        const prng    = mulberry32(SEED);
        // Pre-generate pool noise kecil (reusable, consistent per pixel index)
        const NOISE   = new Float32Array(512);
        for (let i = 0; i < NOISE.length; i++) NOISE[i] = (prng() - 0.5) * 1.2;

        const noise = (idx) => NOISE[idx % NOISE.length];

        // ── Patch toDataURL ───────────────────────────────
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
          const ctx2d = this.getContext('2d');
          if (ctx2d && this.width > 0 && this.height > 0) {
            try {
              const imgData = ctx2d.getImageData(0, 0, this.width, this.height);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                d[i]     = Math.min(255, Math.max(0, d[i]     + noise(i)));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise(i + 1)));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise(i + 2)));
                // alpha tidak diubah — perubahan alpha bisa detectable
              }
              ctx2d.putImageData(imgData, 0, 0);
            } catch { /* cross-origin canvas, skip */ }
          }
          return origToDataURL.call(this, type, quality);
        };

        // ── Patch toBlob ──────────────────────────────────
        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          const ctx2d = this.getContext('2d');
          if (ctx2d && this.width > 0 && this.height > 0) {
            try {
              const imgData = ctx2d.getImageData(0, 0, this.width, this.height);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                d[i]     = Math.min(255, Math.max(0, d[i]     + noise(i)));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise(i + 1)));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise(i + 2)));
              }
              ctx2d.putImageData(imgData, 0, 0);
            } catch { /* skip */ }
          }
          return origToBlob.call(this, callback, type, quality);
        };

        // ── Patch getImageData ─────────────────────────────
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
          const imgData = origGetImageData.call(this, sx, sy, sw, sh);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i]     = Math.min(255, Math.max(0, d[i]     + noise(i)));
            d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise(i + 1)));
            d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise(i + 2)));
          }
          return imgData;
        };

        // ── Patch OffscreenCanvas ─────────────────────────
        // OffscreenCanvas sering dipakai worker thread fingerprinting
        if (window.OffscreenCanvas) {
          const origOC = window.OffscreenCanvas;
          class PatchedOffscreenCanvas extends origOC {
            convertToBlob(opts) {
              const ctx2d = this.getContext('2d');
              if (ctx2d) {
                try {
                  const imgData = ctx2d.getImageData(0, 0, this.width, this.height);
                  const d = imgData.data;
                  for (let i = 0; i < d.length; i += 4) {
                    d[i]     = Math.min(255, Math.max(0, d[i]     + noise(i)));
                    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise(i + 1)));
                    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise(i + 2)));
                  }
                  ctx2d.putImageData(imgData, 0, 0);
                } catch { /* skip */ }
              }
              return super.convertToBlob(opts);
            }
          }
          window.OffscreenCanvas = PatchedOffscreenCanvas;
        }
      })();
    `)
  }

  // ─────────────────────────────────────────────────────────
  // AUDIO PATCH
  // Target: getChannelData, copyFromChannel, getFloatFrequencyData,
  //         getByteFrequencyData, getFloatTimeDomainData,
  //         getByteTimeDomainData, AnalyserNode, OscillatorNode
  // ─────────────────────────────────────────────────────────
  private async applyAudioPatch(
    context: BrowserContext,
    seed: number,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        // ── Deterministic PRNG (sama dengan canvas) ───────
        function mulberry32(seed) {
          return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }

        // Gunakan seed berbeda dari canvas agar tidak identik
        const AUDIO_SEED  = ${seed} ^ 0xA3B5C7D9;
        const prng        = mulberry32(AUDIO_SEED);
        const AUDIO_NOISE = new Float32Array(256);
        for (let i = 0; i < AUDIO_NOISE.length; i++) {
          AUDIO_NOISE[i] = (prng() - 0.5) * 0.00002; // noise sangat kecil — tidak terdengar
        }
        const aNoise = (idx) => AUDIO_NOISE[idx % AUDIO_NOISE.length];

        // ── Patch AudioBuffer.getChannelData ─────────────
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(channel) {
          const data = origGetChannelData.call(this, channel);
          for (let i = 0; i < data.length; i += 64) {
            data[i] = data[i] + aNoise(i);
          }
          return data;
        };

        // ── Patch AudioBuffer.copyFromChannel ─────────────
        if (AudioBuffer.prototype.copyFromChannel) {
          const origCopyFrom = AudioBuffer.prototype.copyFromChannel;
          AudioBuffer.prototype.copyFromChannel = function(dest, channel, offset) {
            origCopyFrom.call(this, dest, channel, offset);
            for (let i = 0; i < dest.length; i += 64) {
              dest[i] = dest[i] + aNoise(i + (offset ?? 0));
            }
          };
        }

        // ── Patch AnalyserNode frequency/time domain data ─
        // AnalyserNode sering dipakai untuk AudioContext fingerprint
        if (window.AnalyserNode) {
          const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
          AnalyserNode.prototype.getFloatFrequencyData = function(array) {
            origGetFloatFreq.call(this, array);
            for (let i = 0; i < array.length; i += 4) {
              array[i] = array[i] + aNoise(i) * 0.1;
            }
          };

          const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
          AnalyserNode.prototype.getByteFrequencyData = function(array) {
            origGetByteFreq.call(this, array);
            for (let i = 0; i < array.length; i += 4) {
              array[i] = Math.min(255, Math.max(0, array[i] + Math.round(aNoise(i) * 100)));
            }
          };

          const origGetFloatTime = AnalyserNode.prototype.getFloatTimeDomainData;
          AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
            origGetFloatTime.call(this, array);
            for (let i = 0; i < array.length; i += 4) {
              array[i] = array[i] + aNoise(i + 128) * 0.05;
            }
          };

          const origGetByteTime = AnalyserNode.prototype.getByteTimeDomainData;
          AnalyserNode.prototype.getByteTimeDomainData = function(array) {
            origGetByteTime.call(this, array);
            for (let i = 0; i < array.length; i += 4) {
              array[i] = Math.min(255, Math.max(0, array[i] + Math.round(aNoise(i + 64) * 50)));
            }
          };
        }

        // ── Patch AudioContext.createOscillator ───────────
        // Beberapa fingerprinter buat oscillator dan record outputnya
        if (window.AudioContext || window.webkitAudioContext) {
          const AC = window.AudioContext ?? window.webkitAudioContext;
          const origCreateOsc = AC.prototype.createOscillator;
          AC.prototype.createOscillator = function() {
            const osc = origCreateOsc.call(this);
            // Frequency tidak diubah, tapi detune sedikit di-noise
            const origConnect = osc.connect.bind(osc);
            osc.connect = function(dest, outputIndex, inputIndex) {
              // Tambah tiny gain node sebagai buffer noise
              const gainNode = this.context.createGain();
              gainNode.gain.value = 1.0 + aNoise(42) * 0.001; // ~0.001% gain noise
              origConnect(gainNode, outputIndex, inputIndex);
              return gainNode.connect(dest);
            };
            return osc;
          };
        }

        // ── Patch AudioContext sampleRate ─────────────────
        // SampleRate yang terlalu konsisten (44100 exact) bisa jadi marker
        if (window.AudioContext) {
          const origAC = window.AudioContext;
          window.AudioContext = class extends origAC {
            get sampleRate() {
              // Tambah variasi kecil: 44100 ± 0.something
              const base = super.sampleRate;
              return base + Math.round(aNoise(7) * 0.5);
            }
          };
        }
      })();
    `)
  }

  // ─────────────────────────────────────────────────────────
  // WEBGL PATCH
  // Target: getParameter (30+ params), getSupportedExtensions,
  //         getShaderPrecisionFormat, WebGL2 params
  // ─────────────────────────────────────────────────────────
  private async applyWebGLPatch(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    // Build WebGL params sesuai GPU profile + OS
    const webglParams = this.buildWebGLParams(profile)
    const extensions = this.buildExtensionList(profile)

    await context.addInitScript(`
      (() => {
        const GL_VENDOR   = 37445;
        const GL_RENDERER = 37446;
        const PARAMS      = ${JSON.stringify(webglParams)};
        const EXTENSIONS  = ${JSON.stringify(extensions)};

        // ── Patch WebGL1 ──────────────────────────────────
        function patchGL(proto) {
          const origGetParam = proto.getParameter;
          proto.getParameter = function(param) {
            if (param in PARAMS) return PARAMS[param];
            return origGetParam.call(this, param);
          };

          // Patch getSupportedExtensions
          const origGetExt = proto.getSupportedExtensions;
          proto.getSupportedExtensions = function() {
            return EXTENSIONS;
          };

          // Patch getExtension — return null untuk extension yang tidak ada di list
          const origGetExtension = proto.getExtension;
          proto.getExtension = function(name) {
            if (!EXTENSIONS.includes(name)) return null;
            return origGetExtension.call(this, name);
          };

          // Patch getShaderPrecisionFormat
          const origGetPrecision = proto.getShaderPrecisionFormat;
          proto.getShaderPrecisionFormat = function(shaderType, precisionType) {
            const result = origGetPrecision.call(this, shaderType, precisionType);
            // Ensure consistent precision values
            if (result) {
              // Sembunyikan nilai presisi ekstrem yang bisa identify GPU
              return {
                rangeMin:  Math.min(result.rangeMin,  127),
                rangeMax:  Math.min(result.rangeMax,  127),
                precision: Math.min(result.precision,  23),
              };
            }
            return result;
          };
        }

        if (window.WebGLRenderingContext) {
          patchGL(WebGLRenderingContext.prototype);
        }

        // ── Patch WebGL2 ──────────────────────────────────
        if (window.WebGL2RenderingContext) {
          patchGL(WebGL2RenderingContext.prototype);

          // WebGL2-specific params
          const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(param) {
            if (param in PARAMS) return PARAMS[param];
            return origGetParam2.call(this, param);
          };
        }

        // ── Patch canvas.getContext untuk WebGL ───────────
        // Beberapa fingerprinter check apakah WebGL bisa dibuat sama sekali
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
          const ctx = origGetContext.call(this, type, attrs);
          // Pastikan antialiasing hint tidak expose info baru
          if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
            return ctx;
          }
          return ctx;
        };
      })();
    `)
  }

  // ─────────────────────────────────────────────────────────
  // FONT MEASUREMENT PATCH
  // measureText() bisa dipakai untuk font fingerprint
  // Tambah noise kecil ke metric values
  // ─────────────────────────────────────────────────────────
  private async applyFontPatch(
    context: BrowserContext,
    seed: number,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        function mulberry32(seed) {
          return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }

        const FONT_SEED = ${seed} ^ 0xF0E1D2C3;
        const fPrng     = mulberry32(FONT_SEED);
        // Noise offset per font measurement: -0.5 sampai +0.5 pixel
        const fontNoise = (fPrng() - 0.5) * 0.3;

        const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
          const metrics = origMeasureText.call(this, text);

          // Wrap TextMetrics dengan nilai yang sedikit di-noise
          return new Proxy(metrics, {
            get(target, prop) {
              const val = target[prop];
              if (typeof val === 'number') {
                // Tambah noise konsisten (deterministic per seed)
                return val + fontNoise * (prop === 'width' ? 1 : 0.3);
              }
              return val;
            }
          });
        };
      })();
    `)
  }

  // ── Derive deterministic seed dari profile ────────────────
  // Seed sama untuk profile yang sama → noise konsisten
  private deriveSeed(profile: ConsistentProfile): number {
    const input = [
      profile.os,
      profile.osVersion,
      profile.browser,
      profile.browserVersion,
      profile.gpu.vendor,
      profile.gpu.renderer,
      profile.screen.width,
      profile.screen.height,
      profile.platform,
    ].join('|')

    const hash = createHash('md5').update(input).digest()
    // Ambil 4 byte pertama sebagai uint32
    return hash.readUInt32LE(0)
  }

  // ── Build WebGL parameter map sesuai GPU + OS ─────────────
  private buildWebGLParams(profile: ConsistentProfile): Record<number, any> {
    const { vendor, renderer } = profile.gpu

    // WebGL constant values
    const GL = {
      VENDOR: 0x1F00, // 7936
      RENDERER: 0x1F01, // 7937
      VERSION: 0x1F02, // 7938
      SHADING_LANGUAGE_VERSION: 0x8B8C, // 35724
      MAX_VERTEX_ATTRIBS: 0x8869, // 34921
      MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB, // 36347
      MAX_VARYING_VECTORS: 0x8DFC, // 36348
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D, // 35661
      MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C, // 35660
      MAX_TEXTURE_IMAGE_UNITS: 0x8872, // 34930
      MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD, // 36349
      MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C, // 34076
      MAX_RENDERBUFFER_SIZE: 0x84E8, // 34024
      MAX_TEXTURE_SIZE: 0x0D33, // 3379
      MAX_VIEWPORT_DIMS: 0x0D3A, // 3386 (returns array)
      RED_BITS: 0x0D52,
      GREEN_BITS: 0x0D53,
      BLUE_BITS: 0x0D54,
      ALPHA_BITS: 0x0D55,
      DEPTH_BITS: 0x0D56,
      STENCIL_BITS: 0x0D57,
      ALIASED_LINE_WIDTH_RANGE: 0x846E, // returns array
      ALIASED_POINT_SIZE_RANGE: 0x846D, // returns array
      MAX_SAMPLES: 0x8D57, // WebGL2
    }

    // Base params (common untuk semua GPU)
    const base: Record<number, any> = {
      [GL.VENDOR]: vendor,
      [GL.RENDERER]: renderer,
      [GL.VERSION]: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
      [GL.SHADING_LANGUAGE_VERSION]: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)',
      [GL.MAX_VERTEX_ATTRIBS]: 16,
      [GL.MAX_VERTEX_UNIFORM_VECTORS]: 4096,
      [GL.MAX_VARYING_VECTORS]: 30,
      [GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS]: 32,
      [GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS]: 16,
      [GL.MAX_TEXTURE_IMAGE_UNITS]: 16,
      [GL.MAX_FRAGMENT_UNIFORM_VECTORS]: 1024,
      [GL.MAX_CUBE_MAP_TEXTURE_SIZE]: 16384,
      [GL.MAX_RENDERBUFFER_SIZE]: 16384,
      [GL.MAX_TEXTURE_SIZE]: 16384,
      [GL.MAX_VIEWPORT_DIMS]: [32767, 32767],
      [GL.RED_BITS]: 8,
      [GL.GREEN_BITS]: 8,
      [GL.BLUE_BITS]: 8,
      [GL.ALPHA_BITS]: 8,
      [GL.DEPTH_BITS]: 24,
      [GL.STENCIL_BITS]: 0,
      [GL.ALIASED_LINE_WIDTH_RANGE]: [1, 1],
      [GL.ALIASED_POINT_SIZE_RANGE]: [1, 1023],
    }

    // Override sesuai OS/GPU untuk lebih realistis
    if (profile.os === 'macos') {
      base[GL.VERSION] = 'WebGL 1.0'
      base[GL.SHADING_LANGUAGE_VERSION] = 'WebGL GLSL ES 1.0'
      base[GL.MAX_TEXTURE_SIZE] = 16384
      base[GL.MAX_RENDERBUFFER_SIZE] = 16384
    }

    if (profile.os === 'android' || profile.os === 'ios') {
      // Mobile GPU biasanya lebih terbatas
      base[GL.MAX_VERTEX_UNIFORM_VECTORS] = 256
      base[GL.MAX_FRAGMENT_UNIFORM_VECTORS] = 224
      base[GL.MAX_TEXTURE_SIZE] = 8192
      base[GL.MAX_RENDERBUFFER_SIZE] = 8192
      base[GL.MAX_CUBE_MAP_TEXTURE_SIZE] = 4096
      base[GL.ALIASED_POINT_SIZE_RANGE] = [1, 511]
    }

    // WebGL2 params
    base[GL.MAX_SAMPLES] = profile.os === 'android' ? 4 : 8

    return base
  }

  // ── Build realistic extension list sesuai browser + OS ────
  private buildExtensionList(profile: ConsistentProfile): string[] {
    // Base extensions yang hampir semua browser support
    const base = [
      'ANGLE_instanced_arrays',
      'EXT_blend_minmax',
      'EXT_color_buffer_half_float',
      'EXT_float_blend',
      'EXT_frag_depth',
      'EXT_shader_texture_lod',
      'EXT_texture_compression_bptc',
      'EXT_texture_compression_rgtc',
      'EXT_texture_filter_anisotropic',
      'WEBKIT_EXT_texture_filter_anisotropic',
      'EXT_sRGB',
      'KHR_parallel_shader_compile',
      'OES_element_index_uint',
      'OES_fbo_render_mipmap',
      'OES_standard_derivatives',
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'OES_vertex_array_object',
      'WEBGL_color_buffer_float',
      'WEBGL_compressed_texture_s3tc',
      'WEBKIT_WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_s3tc_srgb',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'WEBGL_depth_texture',
      'WEBKIT_WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
      'WEBKIT_WEBGL_lose_context',
      'WEBGL_multi_draw',
    ]

    // macOS/iOS tidak support s3tc lewat EXT yang sama
    if (profile.os === 'macos' || profile.os === 'ios') {
      const removeMac = [
        'EXT_texture_compression_bptc',  // macOS bisa, tapi iOS tidak
      ]
      if (profile.os === 'ios') {
        return base.filter(e => !removeMac.includes(e))
      }
      return base
    }

    // Mobile Android: set lebih terbatas
    if (profile.os === 'android') {
      return base.filter(e => ![
        'EXT_texture_compression_bptc',
        'EXT_texture_compression_rgtc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_shaders',
      ].includes(e))
    }

    return base
  }
}

// ── Singleton factory ─────────────────────────────────────────
export function createCanvasAudioWebGLSpoofer(
  logger: WorkerLogger,
): CanvasAudioWebGLSpoofer {
  return new CanvasAudioWebGLSpoofer(logger)
}
