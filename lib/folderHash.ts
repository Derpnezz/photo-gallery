import crypto from 'crypto';

// Secret key - CHANGE THIS to something random!
const SECRET_KEY = 'iaiu4789bklav398gt2q';

export function getFolderHash(folderName: string): string {
  // Create a deterministic, short hash from folder name + secret
  const hash = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(folderName)
    .digest('hex')
    .substring(0, 8);  // First 8 chars of hex hash
  return hash;
}

export function verifyFolderHash(folderName: string, hash: string): boolean {
  return getFolderHash(folderName) === hash;
}