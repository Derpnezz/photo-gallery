import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = req.cookies.media_storage_auth === 'true';
  res.status(200).json({ authenticated: auth });
}