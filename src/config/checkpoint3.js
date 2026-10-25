// Only the dedicated internal APK enables Checkpoint 3 while two-device
// testing is in progress. Standard development and preview builds stay gated.
const checkpoint3TestBuild = process.env.EXPO_PUBLIC_CHECKPOINT3_TEST === 'true';

export const MISSING_PUBLICATION_ENABLED = checkpoint3TestBuild;
export const MISSING_BROWSE_ENABLED = checkpoint3TestBuild;
