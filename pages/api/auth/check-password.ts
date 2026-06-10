import type { NextApiRequest, NextApiResponse } from 'next';

// Change this to your desired password!
const STORAGE_PASSWORD = 'your-secret-password';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  if (password === STORAGE_PASSWORD) {
    // Set a secure HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      `media_storage_auth=true; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    );
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid password' });
}