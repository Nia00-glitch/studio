import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';

// ✅ Smart Firebase Upload with Console Report
export const uploadRecordingToFirebase = async (blob: Blob) => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `recordings/rec_${timestamp}.webm`;
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
