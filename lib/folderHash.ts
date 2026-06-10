import crypto from 'crypto';

// Secret key - CHANGE THIS to something random!
const SECRET_KEY = 'QW3RTY_cypher79154bbyuia3';

export function getFolderHash(folderName: string): string {
  // Create a deterministic, short hash from folder name + secret
  const hash = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(folderName)
    .digest('base64url')
    .substring(0, 8); // Short 8-char slug like "abc123xyz"
  return hash;
}

export function verifyFolderHash(folderName: string, hash: string): boolean {
  return getFolderHash(folderName) === hash;
}