export interface CameraState {
  raw: string | null;
  recording: boolean;
}

export type XmlEntry = { path: string; value: string };

declare global {
  interface Window {
    electronAPI: {
      setCameraIp(ip: string): void;
      startStream(): Promise<string>;
      startUdpListener(): Promise<void>;
      stopUdpListener(): Promise<void>;
      onStreamFrame(callback: (base64: string) => void): () => void;
      getState(): Promise<string>;
      sendSetting(type: string, value: string, value2?: string): Promise<string>;
      getSetting(type: string): Promise<string>;
      getInfo(type: string): Promise<string>;
      camCommand(value: string): Promise<string>;
      camControl(type: string, value: string): Promise<string>;
      triggerShutter(): Promise<string>;
      startRecording(): Promise<string>;
      stopRecording(): Promise<string>;
      getLibraryContents(): Promise<string>;
      getContentInfo(): Promise<string>;
      browseDlna(objectId: string, start: number, count: number): Promise<string>;
      getThumbnail(fileName: string): Promise<string>;
      downloadGeneric(contentId: string, fileName: string, customUrl?: string): Promise<string>;
      deleteRemoteContent(contentId: string): Promise<string>;
      deleteLocalFile(filePath: string): Promise<boolean>;
      showErrorDialog(title: string, message: string): Promise<boolean>;
      getDownloadDirectory(): Promise<string>;
      setDownloadDirectory(dirPath: string): Promise<string>;
      chooseDownloadDirectory(): Promise<string | null>;
      checkLocalFiles(fileNames: string[]): Promise<Record<string, string>>;
      readLocalImageDataUrl(filePath: string): Promise<string>;
      openLocalPath(filePath: string): Promise<boolean>;
      mini: {
        open(): Promise<boolean>;
        close(): Promise<boolean>;
      };
    };
  }
}

export {};
