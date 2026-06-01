/**
 * TPAM Version Management System
 * 
 * Version Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes, major features
 * - MINOR: New features, backward compatible
 * - PATCH: Bug fixes, minor improvements
 */

export const VERSION = "1.0.0";
export const VERSION_NAME = "Initial Release";
export const RELEASE_DATE = "2025-06-01";

export interface VersionInfo {
  version: string;
  versionName: string;
  releaseDate: string;
  buildNumber?: string;
}

export function getVersionInfo(): VersionInfo {
  return {
    version: VERSION,
    versionName: VERSION_NAME,
    releaseDate: RELEASE_DATE,
    buildNumber: process.env.BUILD_NUMBER || undefined,
  };
}

export function formatVersion(): string {
  return `v${VERSION}`;
}

export function getFullVersion(): string {
  return `TPAM v${VERSION} - ${VERSION_NAME}`;
}

/**
 * Version History
 */
export const VERSION_HISTORY: VersionInfo[] = [
  {
    version: "1.0.0",
    versionName: "Initial Release",
    releaseDate: "2025-06-01",
  },
];
