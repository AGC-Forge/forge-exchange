export type PublicSettings = {
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

export type SettingsGroupMap = Record<string, Record<string, string>>;
