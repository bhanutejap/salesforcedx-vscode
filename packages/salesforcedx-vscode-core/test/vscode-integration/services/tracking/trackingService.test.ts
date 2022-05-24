/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTracking } from '@salesforce/source-tracking';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { TrackingService } from '../../../../src/services/trackingService';
import { statusRowsData } from './testdata/statusRowsData';
import { statusSummaryString } from './testdata/statusSummaryStrings';

describe('getSourceStatusSummary', () => {
  it('Should return a properly formatted string when local and remote changes exist.', async () => {
    // Arrange
    const sourceTrackingStub = sinon.createStubInstance(SourceTracking);
    sourceTrackingStub.getStatus.returns(statusRowsData);
    const trackingServiceSUT: TrackingService = new TrackingService(
      sourceTrackingStub
    );

    // Act
    const output: string = await trackingServiceSUT.getSourceStatusSummary({});

    // Assert
    expect(output).to.equal(statusSummaryString);
  });
});
