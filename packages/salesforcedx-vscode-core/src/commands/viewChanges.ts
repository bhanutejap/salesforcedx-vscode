/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LibraryCommandletExecutor } from '@salesforce/salesforcedx-utils-vscode/out/src';
import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/src/types';
import { channelService, OUTPUT_CHANNEL } from '../channels';
import { nls } from '../messages';
import { SourceTrackingService } from '../services/sourceTrackingService';
import {
  EmptyParametersGatherer,
  SfdxCommandlet,
  SfdxWorkspaceChecker
} from './util';

export class SourceTrackingGetStatusExecutor extends LibraryCommandletExecutor<
  string
> {
  private options = {} || undefined;

  constructor(
    executionName: string,
    logName: string,
    options?: { local: boolean; remote: boolean }
  ) {
    super(nls.localize(executionName), logName, OUTPUT_CHANNEL);
    this.options = options;
  }

  public async execute(): Promise<void> {
    const trackingService = new SourceTrackingService();
    const sourceStatusSummary: string = await trackingService.getSourceStatusSummary(
      this.options || {}
    );
    // todo: localize
    channelService.appendLine('Source Status');
    channelService.appendLine(sourceStatusSummary);
    channelService.showChannelOutput();
  }

  public async run(response: ContinueResponse<string>): Promise<boolean> {
    await this.execute();
    return true;
  }
}

const workspaceChecker = new SfdxWorkspaceChecker();
const parameterGatherer = new EmptyParametersGatherer();

export async function viewAllChanges() {
  const executionName = 'force_source_status_text'; // "SFDX: View All Changes (Local and in Default Scratch Org)"
  const logName = 'force_source_status';
  const commandlet = new SfdxCommandlet(
    workspaceChecker,
    parameterGatherer,
    new SourceTrackingGetStatusExecutor(executionName, logName, {
      local: true,
      remote: true
    })
  );
  await commandlet.run();
}

export async function viewLocalChanges() {
  const executionName = 'force_source_status_local_text';
  const logName = 'force_source_status_local';
  const commandlet = new SfdxCommandlet(
    workspaceChecker,
    parameterGatherer,
    new SourceTrackingGetStatusExecutor(executionName, logName, {
      local: true,
      remote: false
    })
  );
  await commandlet.run();
}

export async function viewRemoteChanges() {
  const executionName = 'force_source_status_remote_text';
  const logName = 'force_source_status_remote';
  const commandlet = new SfdxCommandlet(
    workspaceChecker,
    parameterGatherer,
    new SourceTrackingGetStatusExecutor(executionName, logName, {
      local: false,
      remote: true
    })
  );
  await commandlet.run();
}