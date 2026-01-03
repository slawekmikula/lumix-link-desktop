export interface CameraState {
  raw: string | null;
  recording: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      setCameraIp(ip: string): void;
      startStream(): Promise<string>;
      getState(): Promise<string>;
      sendSetting(type: string, value: string, value2?: string): Promise<string>;
      getSetting(type: string): Promise<string>;
      getInfo(type: string): Promise<string>;
      camCommand(value: string): Promise<string>;
      camControl(type: string, value: string): Promise<string>;
      triggerShutter(): Promise<string>;
      startRecording(): Promise<string>;
      stopRecording(): Promise<string>;
      mini: {
        open(): Promise<boolean>;
        close(): Promise<boolean>;
      };
    };
  }
}

export {};
