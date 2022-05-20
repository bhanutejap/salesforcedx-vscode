/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Org, SfdxProject } from '@salesforce/core';
import {
  Command,
  SfdxCommandBuilder
} from '@salesforce/salesforcedx-utils-vscode/out/src/cli';
import {
  Row,
  Table
} from '@salesforce/salesforcedx-utils-vscode/out/src/output';
import {
  SourceTracking,
  SourceTrackingOptions,
  StatusOutputRow
} from '@salesforce/source-tracking';
import { channelService } from '../channels';
import { nls } from '../messages';
import { getRootWorkspacePath, OrgAuthInfo } from '../util';
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

type StatusActualState = 'Deleted' | 'Add' | 'Changed' | 'Unchanged';
type StatusOrigin = 'Local' | 'Remote';
export interface StatusResult {
  state: string;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: boolean;
  conflict?: boolean;
  actualState?: StatusActualState;
  origin: StatusOrigin;
}

interface FormattedStatusResult {
  state: string;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: string;
}

function getFormattedStatusResult(result: StatusResult): FormattedStatusResult {
  return Object.assign(result, {
    ignored: result.ignored ? result.ignored.toString() : '',
    filePath: result.filePath ? result.filePath : ''
  });
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
    // Execute via SFDX CLI
    const executor = new ForceSourceStatusExecutor(flag, command);
    const commandlet = new SfdxCommandlet(
      workspaceChecker,
      parameterGatherer,
      executor
    );
    await commandlet.run();
  } else {
    // Execute via Source Tracking Library
    // 1. get Status from STL
    const projectPath = getRootWorkspacePath();
    const username = await OrgAuthInfo.getDefaultUsernameOrAlias(false);
    const org: Org = await Org.create({ aliasOrUsername: username });
    const project = await SfdxProject.resolve(projectPath);
    const options: SourceTrackingOptions = {
      org,
      project
    };
    // Change the environment to get the node process to use
    // the correct current working directory (process.cwd).
    // Without this, process.cwd() returns "'/'" and SourceTracking.create() fails.
    process.chdir(projectPath);
    const tracking = await SourceTracking.create(options);
    const statusOutputRows = await tracking.getStatus({
      local: true,
      remote: true
    });

    // 2. convert response to formatted output
    const convertedStatusResultsArray = statusOutputRows.map(result =>
      resultConverter(result)
    );

    // 3. show output in channel
    if (convertedStatusResultsArray.length === 0) {
      channelService.appendLine('No local or remote changes found.');
      return;
    }

    channelService.appendLine('Source Status');
    const baseColumns = [
      { label: 'STATE', key: 'state' },
      { label: 'FULL NAME', key: 'fullName' },
      { label: 'TYPE', key: 'type' },
      { label: 'PROJECT PATH', key: 'filePath' }
    ];
    const columns = convertedStatusResultsArray.some(row => row.ignored)
      ? [{ label: 'IGNORED', key: 'ignored' }, ...baseColumns]
      : baseColumns;

    // sort the rows and create a table
    const sortedStatusRows = convertedStatusResultsArray.sort(rowSortFunction);

    const sortedRowsAllStringValues = sortedStatusRows.forEach(row =>
      getFormattedStatusResult(row)
    );

    const table: string = new Table().createTable(
      (sortedStatusRows as unknown) as Row[],
      columns
      // 'Source Status'
    );

    channelService.appendLine(table);
    channelService.showChannelOutput();

    // Questions:
    // * Looked at ForceFunctionStartExecutor.  Still don't get it.
  }
}

/**
 * STL provides a more useful json output.
 * This function makes it consistent with the Status command's json.
 */
// /*
const resultConverter = (input: StatusOutputRow): StatusResult => {
  const { fullName, type, ignored, filePath, conflict } = input;
  const origin = originMap.get(input.origin) || 'Local';
  const actualState = stateMap.get(input.state);
  return {
    fullName,
    type,
    // this string became the place to store information.
    // The JSON now breaks out that info but preserves this property for backward compatibility
    state: `${origin} ${actualState}${conflict ? ' (Conflict)' : ''}`,
    ignored,
    filePath,
    origin,
    actualState,
    conflict
  };
};

const originMap = new Map<StatusOutputRow['origin'], StatusResult['origin']>([
  ['local', 'Local'],
  ['remote', 'Remote']
]);

const stateMap = new Map<StatusOutputRow['state'], StatusResult['actualState']>(
  [
    ['delete', 'Deleted'],
    ['add', 'Add'],
    ['modify', 'Changed'],
    ['nondelete', 'Changed']
  ]
);
// */

// sort order is state, type, fullname
const rowSortFunction = (a: StatusResult, b: StatusResult): number => {
  if (a.state.toLowerCase() === b.state.toLowerCase()) {
    if (a.type.toLowerCase() === b.type.toLowerCase()) {
      return a.fullName.toLowerCase() < b.fullName.toLowerCase() ? -1 : 1;
    }
    return a.type.toLowerCase() < b.type.toLowerCase() ? -1 : 1;
  }
  return a.state.toLowerCase() < b.state.toLowerCase() ? -1 : 1;
};
