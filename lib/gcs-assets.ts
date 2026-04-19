import { Storage } from '@google-cloud/storage'

let storageClient: Storage | null = null

function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage()
  }
  return storageClient
}

function sanitizeWikiSlug(value?: string | null): string {
  const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return normalized || 'default'
}

function sanitizeFilename(value?: string | null, assetId?: number): string {
  const raw = (value || '').trim()
  const leaf = raw.split(/[\\/]/).filter(Boolean).pop() || `asset-${assetId ?? 'file'}`
  const safe = leaf.replace(/[^\w.\-]/g, '_')
  return safe || `asset-${assetId ?? 'file'}`
}

export function getGcsAssetBucket(): string {
  return (process.env.GCS_ASSET_BUCKET || '').trim()
}

export function isGcsAssetReadEnabled(): boolean {
  return getGcsAssetBucket().length > 0
}

export function buildGcsAssetObjectPath(input: {
  wikiSlug?: string
  assetId: number
  filename?: string | null
}): string {
  const prefix = (process.env.GCS_ASSET_PREFIX || 'wiki-assets').trim().replace(/^\/+|\/+$/g, '')
  const wikiSegment = sanitizeWikiSlug(input.wikiSlug)
  const filename = sanitizeFilename(input.filename, input.assetId)
  const idPrefixedName = filename.startsWith(`${input.assetId}-`) ? filename : `${input.assetId}-${filename}`
  return `${prefix}/${wikiSegment}/${idPrefixedName}`
}

function isNotFoundError(error: any): boolean {
  return error?.code === 404 || error?.statusCode === 404
}

export async function readAssetFromGcs(input: {
  wikiSlug?: string
  assetId: number
  filename?: string | null
}): Promise<Buffer | null> {
  const bucketName = getGcsAssetBucket()
  if (!bucketName) return null

  const objectPath = buildGcsAssetObjectPath(input)
  const file = getStorageClient().bucket(bucketName).file(objectPath)

  try {
    const [contents] = await file.download()
    return contents
  } catch (error: any) {
    if (isNotFoundError(error)) {
      return null
    }
    console.error(
      `[gcs-assets] Failed reading gs://${bucketName}/${objectPath} for asset ${input.assetId}:`,
      error,
    )
    return null
  }
}
