export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface Settings {
  autoSendLocation: boolean;
  enableRecording: boolean;
  contacts: Contact[];
}
