const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateVoterId(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `VMK-${suffix}`;
}

export function generatePassword(): string {
  let pwd = "";
  for (let i = 0; i < 6; i++) {
    pwd += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return pwd;
}
