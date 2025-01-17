/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import * as proxyquire from 'proxyquire';
import { SinonStub, stub } from 'sinon';
import { MockExtensionContext } from './MockExtensionContext';

const mShowInformation = stub();
mShowInformation.returns(Promise.resolve());
const vscodeStub = {
  commands: stub(),
  Disposable: stub(),
  Uri: {
    parse: stub()
  },
  window: {
    createOutputChannel: () => {
      return {
        show: () => {}
      };
    },
    showInformationMessage: mShowInformation
  },
  workspace: {
    getConfiguration: () => {
      return {
        get: () => true
      };
    }
  }
};

describe('Telemetry dev mode', () => {
  const extensionName = 'salesforcedx-test';
  let telemetryService: any;
  let mockExtensionContext: MockExtensionContext;
  let teleStub: SinonStub;
  let cliStub: SinonStub;

  beforeEach(() => {
    const reporter = stub();
    const exceptionEvent = stub();
    const telemetryReporterStub = class MockReporter {
      public sendTelemetryEvent = reporter;
      public sendExceptionEvent = exceptionEvent;
      public dispose = stub();
    };

    const cliConfigurationStub = {
      disableCLITelemetry: stub(),
      isCLITelemetryAllowed: () => {
        return Promise.resolve(true);
      }
    };

    // tslint:disable-next-line
    const { TelemetryService } = proxyquire.noCallThru()('../../../src/index', {
      vscode: vscodeStub,
      './telemetryReporter': { default: telemetryReporterStub },
      '../cli/cliConfiguration': cliConfigurationStub
    });

    telemetryService = TelemetryService.getInstance();
    teleStub = stub(telemetryService, 'setCliTelemetryEnabled');
    cliStub = stub(telemetryService, 'checkCliTelemetry');
    cliStub.returns(Promise.resolve(true));
  });

  afterEach(() => {
    teleStub.restore();
    cliStub.restore();
  });

  it('Should not initialize telemetry reporter', async () => {
    // create vscode extensionContext
    mockExtensionContext = new MockExtensionContext(true);

    await telemetryService.initializeService(mockExtensionContext, extensionName);

    const telemetryReporter = telemetryService.getReporter();
    expect(typeof telemetryReporter).to.be.eql('undefined');
    expect(teleStub.firstCall.args).to.eql([true]);
  });

  it('Should disable CLI telemetry', async () => {
    mockExtensionContext = new MockExtensionContext(true);

    cliStub.returns(Promise.resolve(false));
    await telemetryService.initializeService(mockExtensionContext, extensionName);

    expect(teleStub.firstCall.args).to.eql([false]);
  });
});
