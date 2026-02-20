import { execFile } from "child_process";
import { promisify } from "util";

import { ROOT_DIR } from "./constants";

const execFileAsync = promisify(execFile);

const runGit = async (args: string[]) => {
  await execFileAsync("git", args, { cwd: ROOT_DIR });
};

const ensureRemote = async (remoteUrl: string) => {
  try {
    await runGit(["remote", "get-url", "origin"]);
    await runGit(["remote", "set-url", "origin", remoteUrl]);
  } catch {
    await runGit(["remote", "add", "origin", remoteUrl]);
  }
};

export async function syncIconsToRepo(message: string) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const ref = process.env.GITHUB_REF || "main";

  if (!owner || !repo || !token) {
    return;
  }

  const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;

  await ensureRemote(remoteUrl);
  await runGit(["add", "icons"]);
  try {
    await runGit(["commit", "-m", message]);
  } catch {
    return;
  }
  await runGit(["push", "origin", `HEAD:${ref}`]);
}
