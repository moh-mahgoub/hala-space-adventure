/**
 * Audit finding A002-01: browser (e2e) tests must pass BEFORE the live site is
 * published, and they must test the exact artifact that gets published.
 * These checks read .github/workflows/deploy.yml so the gate can't be removed
 * by accident without a failing test.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

type Step = { name?: string; uses?: string; run?: string; if?: string; with?: Record<string, unknown> }
type Job = { needs?: string | string[]; if?: string; steps: Step[]; outputs?: Record<string, string> }
const wf = parse(readFileSync(resolve(__dirname, '../../.github/workflows/deploy.yml'), 'utf8')) as { jobs: Record<string, Job> }
const { build, e2e, deploy } = wf.jobs
const rehearsal = wf.jobs['release-gate-rehearsal']
const needs = (j: Job) => (Array.isArray(j.needs) ? j.needs : j.needs ? [j.needs] : [])
const runs = (j: Job) => j.steps.map((s) => s.run ?? '').join('\n')
const uses = (j: Job) => j.steps.map((s) => s.uses ?? '')

describe('release gate (A002-01)', () => {
  it('deploy waits for BOTH the unit-tested build and the e2e job', () => {
    expect(needs(deploy)).toEqual(expect.arrayContaining(['build', 'e2e']))
  })

  it('deploy only ever runs for pushes to main (never for PRs or other branches)', () => {
    expect(deploy.if).toContain("github.ref == 'refs/heads/main'")
    expect(deploy.if).toContain("github.event_name != 'pull_request'")
    // no always()/failure() escape hatch that would deploy after a failed e2e
    expect(deploy.if ?? '').not.toMatch(/always\(\)|failure\(\)|cancelled\(\)/)
  })

  it('unit tests run before the site is built and packaged', () => {
    const r = build.steps.map((s) => s.run ?? s.uses ?? '')
    expect(r.indexOf('npm test')).toBeGreaterThanOrEqual(0)
    expect(r.indexOf('npm test')).toBeLessThan(r.indexOf('npm run build'))
    expect(uses(build)).toContain('actions/upload-pages-artifact@v3')
  })

  it('e2e tests the published artifact itself: downloads it, verifies its fingerprint, never rebuilds', () => {
    const dl = e2e.steps.find((s) => s.uses?.startsWith('actions/download-artifact'))
    expect(dl?.with?.name).toBe('github-pages')
    expect(runs(e2e)).not.toMatch(/npm run build|vite build/)
    expect(runs(e2e)).toContain('needs.build.outputs.site-sha256')
    expect(build.outputs?.['site-sha256']).toBeTruthy()
    // the fingerprint check comes before the browser tests
    const names = e2e.steps.map((s) => s.name ?? s.run ?? '')
    const check = names.findIndex((n) => /Check it is the artifact/.test(n))
    const tests = names.findIndex((n) => /End-to-end tests/.test(n))
    expect(check).toBeGreaterThan(-1)
    expect(check).toBeLessThan(tests)
  })

  it('deploy publishes the build job\'s artifact and builds nothing itself', () => {
    expect(uses(deploy)).toContain('actions/deploy-pages@v4')
    expect(runs(deploy)).not.toMatch(/npm (ci|run)|vite build/)
  })

  it('the rehearsal job mirrors deploy\'s dependencies but can never run on main', () => {
    expect(needs(rehearsal).sort()).toEqual(needs(deploy).sort())
    expect(rehearsal.if).toBe("github.ref != 'refs/heads/main'")
    expect(uses(rehearsal).join('')).not.toContain('deploy-pages')
  })

  it('the deliberate-failure switch only works in manual runs on non-main branches', () => {
    const step = e2e.steps.find((s) => /fail on purpose/.test(s.name ?? ''))!
    expect(step.if).toContain("github.event_name == 'workflow_dispatch'")
    expect(step.if).toContain("github.ref != 'refs/heads/main'")
  })
})
