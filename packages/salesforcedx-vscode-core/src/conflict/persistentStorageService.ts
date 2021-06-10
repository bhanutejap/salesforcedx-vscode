/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { FileProperties } from '@salesforce/source-deploy-retrieve';
import {
  ExtensionContext,
  Memento
} from 'vscode';
import { nls } from '../messages';

interface ConflictFileProperties {
  lastModifiedDate: string;
}

export class PersistentStorageService {
  private storage: Memento;
  private static instance?: PersistentStorageService;

  private constructor(context: ExtensionContext) {
    this.storage = context.globalState;
  }

  public static initialize(context: ExtensionContext) {
    PersistentStorageService.instance = new PersistentStorageService(context);
  }

  public static getInstance(): PersistentStorageService {
    if (!PersistentStorageService.instance) {
      const errorMsg = nls.localize('conflict_detect_initialization_error');
      throw new Error(errorMsg);
    }
    return PersistentStorageService.instance;
  }

  public getPropertiesForFile(key: string): ConflictFileProperties | undefined {
    return this.storage.get<ConflictFileProperties>(key);
  }

  public setPropertiesForFile(key: string, conflictFileProperties: ConflictFileProperties | undefined) {
    this.storage.update(key, conflictFileProperties);
  }

  public setPropertiesForFilesRetrieve(fileProperties: FileProperties | FileProperties[]) {
    const fileArray = Array.isArray(fileProperties) ? fileProperties : [fileProperties];
    for (const fileProperty of fileArray) {
      this.setPropertiesForFile(
        this.makeKey(fileProperty.type, fileProperty.fullName),
        {
          lastModifiedDate: fileProperty.lastModifiedDate
        });
    }
  }

  public makeKey(type: string, fullName: string): string {
    return `${type}#${fullName}`;
  }
}