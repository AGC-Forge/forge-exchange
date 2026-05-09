import type { NavigationMenuItem } from "@nuxt/ui";

declare global {
  interface Window {
    dataLayer: any[];
    fbq: any;
    ttq: any;
    ethereum?: {
      isMetaMask?: true;
      request: (...args: any[]) => Promise<void>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        eventName: string,
        callback: (...args: any[]) => void,
      ) => void;
    };
  }

  interface ApiMeta {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }

  interface ApiError {
    code: string;
    message?: string;
    redirect_url?: string;
    details?: any;
    fieldErrors?: Record<string, string[]>;
    retryable?: boolean;
    timestamp?: string;
  }

  interface ApiResponse<T = any, M extends Record<string, any> = ApiMeta> {
    status: number;
    success: boolean;
    message: string;
    data?: T | null;
    error?: ApiError;
    meta?: M;
    headers?: Record<string, string>;
  }

  type FieldErrors = Record<string, string[]>;

  interface ApiErrorOptions {
    code: string;
    message?: string;
    statusCode?: number;
    redirectUrl?: string;
    details?: any;
    fieldErrors?: FieldErrors;
    retryable?: boolean;
  }

  type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

  interface SettingResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  }
  interface UploadResult {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }
  interface PostgresRangeDate {
    start: string;
    end: string;
  }

  type SettingRow = Pick<SettingConfig, "key" | "value"> & {
    updated_at?: Date;
  };

  interface SettingConfig {
    site_name: string;
    site_description: string;
    site_keywords: string;
    site_icon: string;
    site_logo: string;
    site_favicon: string;
    site_theme: string;
    is_maintenance: boolean;
    enable_register: boolean;
    enable_github_provider: boolean;
    enable_google_provider: boolean;
    max_upload_size_mb: number;
    max_upload_image_mb: number;
    max_upload_video_mb: number;
    max_upload_audio_mb: number;
    max_upload_document_mb: number;
    max_upload_code_mb: number;
    max_upload_archive_mb: number;
  }

  type AllowedMimeType =
    // Image
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "image/svg+xml"
    // Video
    | "video/mp4"
    | "video/webm"
    | "video/quicktime"
    // Audio
    | "audio/mpeg"
    | "audio/wav"
    | "audio/ogg"
    // Document
    | "application/pdf"
    | "application/msword"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "text/plain"
    | "text/markdown"
    // Code
    | "text/html"
    | "text/css"
    | "text/javascript"
    | "application/json"
    | "application/yaml"
    | "text/x-python"
    | "text/x-typescript";

  type MediaType =
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "DOCUMENT"
    | "CODE"
    | "ARCHIVE"
    | "OTHER";

  interface CountryItem {
    name: string;
    code: string;
    emoji: string;
    unicode: string;
    image: string;
    dial_code: string;
    minLength?: number;
    maxLength?: number;
  }
  interface AppNavigationMenuItem extends NavigationMenuItem {
    role?: string[];
  }

  type PublicSettings = {
    site_name: string;
    site_description: string;
    site_keywords: string;
    site_icon: string;
    site_logo: string;
    site_favicon: string;
    site_theme: string;
    is_maintenance: boolean;
    enable_register: boolean;
    enable_github_provider: boolean;
    enable_google_provider: boolean;
    max_upload_size_mb: number;
    max_upload_image_mb: number;
    max_upload_video_mb: number;
    max_upload_audio_mb: number;
    max_upload_document_mb: number;
    max_upload_code_mb: number;
    max_upload_archive_mb: number;
  };

  type SettingsGroupMap = Record<string, Record<string, string>>;
}

export {};
