import { Org, SfdxProject } from '@salesforce/core';
import {
  Row,
  Table
} from '@salesforce/salesforcedx-utils-vscode/out/src/output';
import {
  SourceTracking,
  SourceTrackingOptions,
  StatusOutputRow
} from '@salesforce/source-tracking';
import { getRootWorkspacePath, OrgAuthInfo } from '../util';

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

function getFormattedStatusResult(result: StatusResult): FormattedStatusResult {
  return Object.assign(result, {
    ignored: result.ignored ? result.ignored.toString() : '',
    filePath: result.filePath ? result.filePath : ''
  });
}
interface FormattedStatusResult {
  state: string;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: string;
}

class SourceStatusSummary {
  constructor(private rows: StatusOutputRow[]) {}

  public asString(): string {
    // 2. convert response to formatted output
    const convertedStatusResultsArray = this.rows.map(result =>
      resultConverter(result)
    );

    // 3. show output in channel
    if (convertedStatusResultsArray.length === 0) {
      return 'No local or remote changes found.';
    }

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
    );
    return table;
  }
}
export class TrackingService {
  private static _instance: TrackingService;

  public static get instance() {
    if (TrackingService._instance === undefined) {
      TrackingService._instance = new TrackingService();
    }
    return TrackingService._instance;
  }

  private constructor() {}

  public getSourceStatusSummary = async (): Promise<string> => {
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

    const summary: SourceStatusSummary = new SourceStatusSummary(
      statusOutputRows
    );
    return summary.asString();
  };
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
