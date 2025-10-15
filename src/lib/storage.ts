
import { ref, uploadBytes } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { getApps, getApp, initializeApp } from 'firebase/app';

// ✅ Smart Firebase Upload with Console Report
export const uploadRecordingToFirebase = async (blob: Blob) => {
  try {
    // This is a temporary workaround because this file is not wrapped in the provider.
    // In a larger app, we would get `storage` from a context.
    const app = getApps().length > 0 ? getApp() : initializeApp({});
    const storage = getStorage(app);

    const timestamp = new Date().toISOString();
    const fileExtension = blob.type.split('/')[1].split(';')[0] || 'webm';
    const filename = `recordings/rec_${timestamp}.${fileExtension}`;
    const fileRef = ref(storage, filename);

    // 🔼 Upload the blob to Firebase Storage
    const snapshot = await uploadBytes(fileRef, blob);

    // ✅ Report to console or AI Agent
    const report = {
      status: '✅ Upload Successful',
      filePath: snapshot.metadata.fullPath,
      size: `${(snapshot.metadata.size / 1024).toFixed(2)} KB`,
      contentType: snapshot.metadata.contentType,
      uploadedAt: new Date().toLocaleString(),
    };

    console.log('📤 Firebase Upload Report:', report);
    return report;
  } catch (error: any) {
    const errorReport = {
      status: '❌ Upload Failed',
      reason: error.message,
      time: new Date().toLocaleString(),
    };
    console.error('🚨 Firebase Upload Error:', errorReport);
    return errorReport;
  }
};
