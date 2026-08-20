
import { ref, uploadBytes } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { getApps, getApp, initializeApp } from 'firebase/app';

export type StorageUploadReport = 
  | { status: '✅ Upload Successful'; filePath: string; size: string; contentType?: string; uploadedAt: string }
  | { status: '❌ Upload Failed'; reason: string; time: string };

// ✅ Smart Firebase Upload with Console Report
export const uploadRecordingToFirebase = async (blob: Blob): Promise<StorageUploadReport> => {
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
    const report: StorageUploadReport = {
      status: '✅ Upload Successful' as const,
      filePath: snapshot.metadata.fullPath,
      size: `${(snapshot.metadata.size / 1024).toFixed(2)} KB`,
      contentType: snapshot.metadata.contentType,
      uploadedAt: new Date().toLocaleString(),
    };

    console.log('📤 Firebase Upload Report:', report);
    return report;
  } catch (error: any) {
    const errorReport: StorageUploadReport = {
      status: '❌ Upload Failed' as const,
      reason: error.message || 'Unknown storage error',
      time: new Date().toLocaleString(),
    };
    console.error('🚨 Firebase Upload Error:', errorReport);
    return errorReport;
  }
};
