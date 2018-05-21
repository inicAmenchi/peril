import { getTemporaryAccessTokenForInstallation } from "../api/github"
import { dangerRepresentationForPath, RunType } from "../danger/danger_run"
import { runDangerForInstallation, ValidatedPayload } from "../danger/danger_runner"
import { DangerfileReferenceString, GitHubInstallation } from "../db/index"
import { getGitHubFileContents } from "../github/lib/github_helpers"
import winston from "../logger"

const error = (message: string) => {
  winston.info(`[github auth] - ${message}`)
  console.error(message) // tslint:disable-line
}

export const runTask = async (installation: GitHubInstallation, rules: DangerfileReferenceString, data: any) => {
  const rep = dangerRepresentationForPath(rules)
  if (rep.repoSlug === undefined) {
    // If you don't provide a repo slug, assume that the
    // dangerfile comes from inside the same repo as your settings.
    rep.repoSlug = dangerRepresentationForPath(installation.perilSettingsJSONURL).repoSlug
  } else {
    error(`Error: could not determine a repo for ${rules} - skipping the task run`)
  }

  // Expand the Peril DSL which is created later with data from the task
  const dangerDSL = {
    peril: {
      data,
    },
  }
  const payload: ValidatedPayload = {
    dsl: dangerDSL as any, // This can't have a git,
    webhook: data,
  }
  const token = await getTemporaryAccessTokenForInstallation(installation.iID)
  const dangerfile = await getGitHubFileContents(token, rep.repoSlug!, rep.dangerfilePath, rep.branch)
  return runDangerForInstallation([dangerfile], [rep.dangerfilePath], null, RunType.import, installation, payload)
}
