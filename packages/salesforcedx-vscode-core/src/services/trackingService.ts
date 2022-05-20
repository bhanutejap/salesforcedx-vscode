import { StatusOutputRow } from '@salesforce/source-tracking';

type StatusActualState = 'Deleted' | 'Add' | 'Changed' | 'Unchanged';
type StatusOrigin = 'Local' | 'Remote';
// type StatusStateString = `${StatusOrigin} ${StatusActualState}` | `${StatusOrigin} ${StatusActualState} (Conflict)`;
interface StatusResult {
  // state: StatusStateString;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: boolean;
  conflict?: boolean;
  actualState?: StatusActualState;
  origin: StatusOrigin;
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

  /**
   * STL provides a more useful json output.
   * This function makes it consistent with the Status command's json.
   */
  public static resultConverter = (input: StatusOutputRow): StatusResult => {
    const { fullName, type, ignored, filePath, conflict } = input;
    const origin = this.originMap.get(input.origin);
    const actualState = this.stateMap.get(input.state);
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

  private static originMap = new Map<
    StatusOutputRow['origin'],
    StatusResult['origin']
  >([
    ['local', 'Local'],
    ['remote', 'Remote']
  ]);

  private static stateMap = new Map<
    StatusOutputRow['state'],
    StatusResult['actualState']
  >([
    ['delete', 'Deleted'],
    ['add', 'Add'],
    ['modify', 'Changed'],
    ['nondelete', 'Changed']
  ]);
}
