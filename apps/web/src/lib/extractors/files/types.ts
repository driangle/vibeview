import type { ContentBlockInput } from '../../../types';

export interface FileContentEntry {
  toolUseId: string;
  toolName: string;
  filePath: string;
  input: ContentBlockInput;
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
