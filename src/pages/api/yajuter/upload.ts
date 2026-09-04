import { readFileSync } from 'node:fs';
import formidable from 'formidable';
import { requireGate } from '@lib/api-auth';
import { getServiceClient } from '@lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { File } from 'formidable';

export const config = {
  api: { bodyParser: false }
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function extOf(name: string, mime: string): string {
  const fromName = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fromName))
    return fromName === 'jpeg' ? 'jpg' : fromName;
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  return 'webp';
}

// POST /api/yajuter/upload?bucket=uploads|pilgrimage (multipart, field "image").
// Stores into a private bucket, returns the storage path.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!requireGate(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const form = formidable({
    multiples: false,
    maxFileSize: MAX_BYTES,
    maxFiles: 1
  });

  let file: File;
  try {
    const [, files] = await form.parse(req);
    const single = files.image;
    file = (Array.isArray(single) ? single[0] : single) as File;
    if (!file) {
      res.status(400).json({ ok: false });
      return;
    }
  } catch {
    res
      .status(400)
      .json({ ok: false, error: 'まずいですよ！（画像が読めない）' });
    return;
  }

  const mime = file.mimetype ?? '';
  if (!ALLOWED.has(mime) || (file.size ?? 0) <= 0) {
    res.status(400).json({ ok: false, error: 'まずいですよ！（画像形式）' });
    return;
  }

  const ext = extOf(file.originalFilename ?? '', mime);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `u1-${Date.now()}-${rand}.${ext}`;
  const bucket = req.query.bucket === 'pilgrimage' ? 'pilgrimage' : 'uploads';

  const sb = getServiceClient();
  const buffer = readFileSync(file.filepath);
  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: false
  });

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true, path });
}
