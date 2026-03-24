export interface FileContentEntry {
  toolUseId: string;
  toolName: string;
  filePath: string;
  input: Record<string, unknown>;
  timestamp: string;
  messageUuid: string;
}

export interface FilesByCategory {
  written: string[];
  read: string[];
}

export interface FilesResult {
  categories: FilesByCategory;
  entries: FileContentEntry[];
}
