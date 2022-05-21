/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTracking } from '@salesforce/source-tracking';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { nls } from '../../../../src/messages';
import { TrackingService } from '../../../../src/services/trackingService';
import { statusRowsData } from './testdata/statusRowsData';
import { statusSummaryString } from './testdata/statusSummaryStrings';
// tslint:disable:no-unused-expression
describe('getSourceStatusSummary', () => {
  it('Should return a formatted string when local and remote changes exist', async () => {
    const stubSourceTracking = sinon.createStubInstance(SourceTracking);
    stubSourceTracking.getStatus.returns(statusRowsData);
    const output: string = await TrackingService.instance.getSourceStatusSummary(
      {}
    );

    console.log(statusRowsData);
    console.log(output);
  });
});
