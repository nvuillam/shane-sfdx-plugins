import fs = require('fs-extra');
import jsToXml = require('js2xmlparser');

import { exec, exec2JSON } from '../../../../src/shared/execProm';
import * as options from '../../../../src/shared/js2xmlStandardOptions';
import testutils = require('../../../helpers/testutils');

const testProjectName = 'testProjectUserPermsetAssign';
const maxBuffer = 1000 * 1024;

const permsetName = 'AccountRead';
const permsetMeta = {
    '@': {
        xmlns: 'http://soap.sforce.com/2006/04/metadata'
    },
    hasActivationRequired: 'false',
    label: permsetName,
    objectPermissions: [
        {
            allowRead: 'true',
            object: 'Account'
        }
    ]
};

describe('shane:user:permset:assign', () => {
    jest.setTimeout(testutils.remoteTimeout);

    if (!process.env.LOCALONLY) {
        beforeAll(async () => {
            await fs.remove(testProjectName);
            await exec(`sfdx force:project:create -n ${testProjectName}`);
            await testutils.orgCreate(testProjectName);
            await fs.ensureDir(`${testProjectName}/force-app/main/default/permissionsets`);
            // convert to xml and write out the file
            const xml = jsToXml.parse('PermissionSet', permsetMeta, options.js2xmlStandardOptions);
            await fs.writeFile(`${testProjectName}/force-app/main/default/permissionsets/${permsetName}.permissionset-meta.xml`, xml);
            await exec(`sfdx force:source:push`, { cwd: testProjectName });
        });

        it('assigns the permset with no name given', async () => {
            const setResult = await exec2JSON(`sfdx shane:user:permset:assign -n ${permsetName} --json`, {
                cwd: testProjectName,
                maxBuffer
            });
            expect(setResult.status).toBe(0);
            const delResult = await exec2JSON(`sfdx force:data:record:delete -s PermissionSetAssignment -i ${setResult.result.id} --json`, {
                cwd: testProjectName,
                maxBuffer
            });

            expect(delResult.status).toBe(0);
        });

        it('assigns the permset with first/last name given', async () => {
            const setResult = await exec2JSON(`sfdx shane:user:permset:assign -n ${permsetName} -g Integration -l User --json`, {
                cwd: testProjectName,
                maxBuffer
            });
            expect(setResult.status).toBe(0);
            // await exec(`sfdx force:data:record:delete -s PermissionSetAssignment -i ${setResult.result.id}`);
        });

        afterAll(async () => {
            await testutils.orgDelete(testProjectName);
            await fs.remove(testProjectName);
        });
    }
});