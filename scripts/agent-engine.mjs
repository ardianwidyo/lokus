/**
 * Creates, lists and deletes the LOKUS Agent Engine.
 *
 * Why a script and not Terraform: the Google provider 6.12 that `infra/` is
 * validated against has no `reasoningEngine` resource, and inventing one with
 * `google_project_service_resource` shims would be a worse lie than an honest
 * script. `infra/README.md` says so, and this file is the step it points at.
 *
 * The engine holds sessions; it runs none of our code. That distinction is the
 * whole point — see plan.md, 2026-08-07.
 *
 *   node scripts/agent-engine.mjs create            # sessions-only, no runtime
 *   node scripts/agent-engine.mjs deploy <imageUri>  # container-backed supervisor
 *   node scripts/agent-engine.mjs list
 *   node scripts/agent-engine.mjs delete <id>
 *
 * Credentials come from Application Default Credentials, same as the API:
 * `gcloud auth application-default login`, or a service account on the runtime.
 */
import { execFileSync } from 'node:child_process';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
// Not GOOGLE_CLOUD_LOCATION: that one points at the Gemini endpoint, which is
// `global` because Jakarta does not serve those models. Agent Engine does, so
// the sessions stay in region with the rest of the tenant's data.
const LOCATION = process.env.LOKUS_AGENT_ENGINE_LOCATION ?? 'asia-southeast2';
const DISPLAY_NAME = `lokus-${process.env.LOKUS_ENVIRONMENT ?? 'dev'}`;

if (!PROJECT) {
  console.error('GOOGLE_CLOUD_PROJECT belum diset.');
  process.exit(1);
}

const host = LOCATION === 'global' ? 'aiplatform.googleapis.com' : `${LOCATION}-aiplatform.googleapis.com`;
const parent = `projects/${PROJECT}/locations/${LOCATION}`;
const base = `https://${host}/v1/${parent}/reasoningEngines`;

const token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
  encoding: 'utf8',
  shell: true,
}).trim();

const [command, argument] = process.argv.slice(2);

const request = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`${response.status} ${JSON.stringify(body).slice(0, 400)}`);
    process.exit(1);
  }
  return body;
};

switch (command) {
  case 'create': {
    const operation = await request(base, {
      method: 'POST',
      body: JSON.stringify({
        displayName: DISPLAY_NAME,
        description:
          'LOKUS agent runs: one session per question, one event per numbered step (constitution III).',
      }),
    });
    // A spec-less engine is created immediately; there is nothing to build.
    const name = operation.response?.name ?? operation.name?.split('/operations/')[0];
    console.log(name);
    console.log('\nSet this in the API process:');
    console.log(`  LOKUS_AGENT_ENGINE=${name}`);
    break;
  }

  case 'deploy': {
    // The container-backed engine: this one actually runs the supervisor.
    // Blocked until the Agent Engine service agent can read the image — see
    // plan.md, 2026-08-07. Build first:
    //   gcloud builds submit --config infra/cloudbuild-agent.yaml \
    //     --substitutions _IMAGE=<image> --service-account=<sa> .
    if (!argument) {
      console.error('Sebutkan image-nya: node scripts/agent-engine.mjs deploy <imageUri>');
      process.exit(1);
    }

    const operation = await request(base, {
      method: 'POST',
      body: JSON.stringify({
        displayName: `${DISPLAY_NAME}-supervisor`,
        description: 'LOKUS supervisor: routing, parallel delegation, merge, guardrails, numbered trace.',
        spec: {
          containerSpec: { imageUri: argument, port: 8080 },
          // Must match what api/src/agentRuntime.js actually serves; a method
          // declared here and missing there is a 400 discovered by a caller.
          classMethods: [
            { name: 'ask', api_mode: '' },
            { name: 'briefing', api_mode: '' },
          ],
          agentFramework: 'custom',
        },
      }),
    });
    console.log(operation.name);
    console.log('\nDeployment berjalan beberapa menit. Pantau:');
    console.log(`  gcloud ai operations describe ${operation.name.split('/').pop()} --region ${LOCATION}`);
    break;
  }

  case 'list': {
    const body = await request(base);
    for (const engine of body.reasoningEngines ?? []) {
      console.log(`${engine.name}\n  ${engine.displayName} · dibuat ${engine.createTime}`);
    }
    if (!(body.reasoningEngines ?? []).length) console.log('(kosong)');
    break;
  }

  case 'delete': {
    if (!argument) {
      console.error('Sebutkan id engine-nya: node scripts/agent-engine.mjs delete <id>');
      process.exit(1);
    }
    // `force` also removes the sessions under it, which is the only thing in it.
    await request(`${base}/${argument}?force=true`, { method: 'DELETE' });
    console.log(`dihapus: ${argument}`);
    break;
  }

  default:
    console.error('Perintah: create | deploy <imageUri> | list | delete <id>');
    process.exit(1);
}
