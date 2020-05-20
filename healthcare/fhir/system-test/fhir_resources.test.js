// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const path = require('path');
const assert = require('assert');
const uuid = require('uuid');
const {execSync} = require('child_process');

const projectId = process.env.GCLOUD_PROJECT;
const cloudRegion = 'us-central1';

const cwd = path.join(__dirname, '..');
const cwdDatasets = path.join(__dirname, '../../datasets');
const datasetId = `nodejs-docs-samples-test-${uuid.v4()}`.replace(/-/gi, '_');
const fhirStoreId = `nodejs-docs-samples-test-fhir-store${uuid.v4()}`.replace(
  /-/gi,
  '_'
);

const bundleFile = 'resources/bundle.json';
const resourceType = 'Patient';
const version = 'STU3';
let resourceId;

before(() => {
  assert(
    process.env.GCLOUD_PROJECT,
    `Must set GCLOUD_PROJECT environment variable!`
  );
  assert(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    `Must set GOOGLE_APPLICATION_CREDENTIALS environment variable!`
  );
  execSync(
    `node createDataset.js ${projectId} ${cloudRegion} ${datasetId}`,
    {cwd: cwdDatasets}
  );
});
after(() => {
  try {
    execSync(
      `node deleteDataset.js ${projectId} ${cloudRegion} ${datasetId}`,
      {cwd: cwdDatasets}
    );
  } catch (err) {} // Ignore error
});

it('should create a FHIR resource', () => {
  execSync(
    `node createFhirStore.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${version}`,
    {cwd}
  );
  const output = execSync(
    `node fhir_resources.js createResource ${datasetId} ${fhirStoreId} ${resourceType}`,
    {cwd}
  );
  const createdResource = new RegExp(
    `Created FHIR resource ${resourceType} with ID (.*).`
  );
  assert.strictEqual(createdResource.test(output), true);
  [, resourceId] = createdResource.exec(output);
});

it('should get a FHIR resource', () => {
  const output = execSync(
    `node getFhirResource.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(
    new RegExp(`Got ${resourceType} resource`).test(output),
    true
  );
});

it('should list and get a FHIR resource history', () => {
  let output = execSync(
    `node listFhirResourceHistory.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.ok(output.includes('versionId'));

  // Get the version ID here from the response because it's generated by the server
  const formatted = JSON.parse(output);
  const {
    entry: [
      {
        resource: {
          meta: {versionId},
        },
      },
    ],
  } = formatted;

  output = execSync(
    `node getFhirResourceHistory.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId} ${versionId}`,
    {cwd}
  );
  assert.ok(output.includes(versionId));
});

it('should get everything in Patient compartment', () => {
  const output = execSync(
    `node getPatientEverything.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(
    new RegExp(`Got all resources in patient ${resourceId} compartment`).test(
      output
    ),
    true
  );
});

it('should update a FHIR resource', () => {
  const output = execSync(
    `node updateFhirResource.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(
    new RegExp(`Updated ${resourceType} resource`).test(output),
    true
  );
});

it('should patch a FHIR resource', () => {
  const output = execSync(
    `node fhir_resources.js patchResource ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(output, `Patched ${resourceType} resource`);
});

it('should search for FHIR resources using GET', () => {
  const output = execSync(
    `node searchFhirResourcesGet.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType}`
  );
  assert.strictEqual(new RegExp('Resources found').test(output), true);
});

it('should search for FHIR resources using POST', () => {
  const output = execSync(
    `node searchFhirResourcesPost.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType}`
  );
  assert.strictEqual(new RegExp('Resources found').test(output), true);
});

it('should purge all historical versions of a FHIR resource', () => {
  const output = execSync(
    `node deleteFhirResourcePurge.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(
    output,
    `Deleted all historical versions of ${resourceType} resource`
  );
});

it('should execute a Bundle', () => {
  const output = execSync(
    `node fhir_resources.js executeBundle ${datasetId} ${fhirStoreId} ${bundleFile}`,
    {cwd}
  );
  assert.strictEqual(new RegExp('Executed Bundle').test(output), true);
});

it('should delete a FHIR resource', () => {
  const output = execSync(
    `node deleteFhirResource.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId} ${resourceType} ${resourceId}`,
    {cwd}
  );
  assert.strictEqual(output, `Deleted FHIR resource ${resourceType}`);

  // Clean up
  execSync(
    `node deleteFhirStore.js ${projectId} ${cloudRegion} ${datasetId} ${fhirStoreId}`,
    {cwd}
  );
});
