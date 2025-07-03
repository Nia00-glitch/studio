import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export const saveRecordingToFirebase = async (audioBlob: Blob) => {
  try {
    const fileName = `recordings/nia-recording-${uuidv4()}.webm`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, audioBlob);
    console.log('✅ Recording uploaded to Firebase:', fileName);
    return fileName;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
};
