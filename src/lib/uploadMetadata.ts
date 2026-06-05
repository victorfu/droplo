export interface SiteDocumentInput {
  siteId: string;
  uid: string;
  fileCount: number;
  totalSize: number;
  originalName: string;
  createdAt: unknown;
  passwordEnabled: boolean;
}

export interface SiteDocument {
  siteId: string;
  uid: string;
  fileCount: number;
  totalSize: number;
  originalName: string;
  createdAt: unknown;
  passwordEnabled: boolean;
}

export function buildSiteDocument(input: SiteDocumentInput): SiteDocument {
  return {
    siteId: input.siteId,
    uid: input.uid,
    fileCount: input.fileCount,
    totalSize: input.totalSize,
    originalName: input.originalName,
    createdAt: input.createdAt,
    passwordEnabled: input.passwordEnabled,
  };
}
