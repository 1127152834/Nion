export function shouldAdoptConfigSnapshot(input: {
  currentVersion: string;
  nextVersion: string;
}) {
  return input.currentVersion !== input.nextVersion;
}
