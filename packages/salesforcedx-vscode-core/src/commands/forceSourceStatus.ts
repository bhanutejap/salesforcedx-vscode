/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LibraryCommandletExecutor } from '@salesforce/salesforcedx-utils-vscode/out/src';
import {
  Command,
  SfdxCommandBuilder
} from '@salesforce/salesforcedx-utils-vscode/out/src/cli';
import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/src/types';
import { channelService, OUTPUT_CHANNEL } from '../channels';
import { nls } from '../messages';
import { SourceTrackingService } from '../services/sourceTrackingService';
import {
  CommandParams,
  CommandVersion,
  EmptyParametersGatherer,
  FlagParameter,
  SfdxCommandlet,
  SfdxCommandletExecutor,
  SfdxWorkspaceChecker
} from './util';

export enum SourceStatusFlags {
  Local = '--local',
  Remote = '--remote'
}

export const statusCommand: CommandParams = {
  command: 'force:source:status',
  description: {
    default: 'force_source_status_text',
    local: 'force_source_status_local_text',
    remote: 'force_source_status_remote_text'
  },
  logName: {
    default: 'force_source_status',
    local: 'force_source_status_local',
    remote: 'force_source_status_remote'
  }
};

export const statusCommandLegacy: CommandParams = {
  command: 'force:source:legacy:status',
  description: { default: 'force_source_legacy_status_text' },
  logName: { default: 'force_source_legacy_status' }
};

export class SourceTrackingGetStatusExecutor extends LibraryCommandletExecutor<
  string
> {
  private flag: SourceStatusFlags | undefined;

  constructor(
    executionName: string,
    logName: string,
    flag?: SourceStatusFlags | undefined
  ) {
    super(nls.localize(executionName), logName, OUTPUT_CHANNEL);
    this.flag = flag;
  }

  public async run(response: ContinueResponse<string>): Promise<boolean> {
    const trackingService = new SourceTrackingService();
    const sourceStatusOptions = {
      remote: !(this.flag && this.flag === SourceStatusFlags.Local)
    };
    const sourceStatusSummary: string = await trackingService.getSourceStatusSummary(
      sourceStatusOptions
    );
    channelService.appendLine('Source Status');
    channelService.appendLine(sourceStatusSummary);
    channelService.showChannelOutput();
    return true;
  }
}

export class ForceSourceStatusExecutor extends SfdxCommandletExecutor<{}> {
  private flag: SourceStatusFlags | undefined;

  public constructor(
    flag?: SourceStatusFlags,
    public params: CommandParams = statusCommand
  ) {
    super();
    this.flag = flag;
  }

  public build(data: {}): Command {
    const builder = new SfdxCommandBuilder()
      .withDescription(nls.localize(this.params.description.default))
      .withArg(this.params.command)
      .withLogName(this.params.logName.default);
    if (this.flag === SourceStatusFlags.Local) {
      builder.withArg(this.flag);
      builder.withDescription(nls.localize(this.params.description.local));
      builder.withLogName(this.params.logName.local);
    } else if (this.flag === SourceStatusFlags.Remote) {
      builder.withArg(this.flag);
      builder.withDescription(nls.localize(this.params.description.remote));
      builder.withLogName(this.params.logName.remote);
    }
    return builder.build();
  }
}

const workspaceChecker = new SfdxWorkspaceChecker();
const parameterGatherer = new EmptyParametersGatherer();

export async function forceSourceStatus(
  this: FlagParameter<SourceStatusFlags>
) {
  const { flag, commandVersion } = this || {};
  const command =
    commandVersion === CommandVersion.Legacy
      ? statusCommandLegacy
      : statusCommand;

  if (commandVersion === CommandVersion.Legacy) {
    // Execute using SFDX CLI
    const executor = new ForceSourceStatusExecutor(flag, command);
    const commandlet = new SfdxCommandlet(
      workspaceChecker,
      parameterGatherer,
      executor
    );
    await commandlet.run();
  } else {
    // Execute using Source Tracking library
    const isOnlyLocalChanges = flag === SourceStatusFlags.Local.toString();
    const executionName = isOnlyLocalChanges
      ? 'force_source_status_local_text'
      : 'force_source_status_text';
    const logName = isOnlyLocalChanges
      ? 'force_source_status_local'
      : 'force_source_status';
    const commandlet = new SfdxCommandlet(
      new SfdxWorkspaceChecker(),
      new EmptyParametersGatherer(),
      new SourceTrackingGetStatusExecutor(executionName, logName, flag)
    );
    await commandlet.run();
  }
}
