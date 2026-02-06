import { simpleGit, SimpleGit } from 'simple-git';
import { glob } from 'glob';
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, join, dirname } from 'path';
import { getConfig } from './config.js';
import { createHash } from 'crypto';
import os from 'os';

interface RepoChange {
  repoName: string;  // 仅发送仓库名称，不发送完整路径（安全考虑）
  branch: string;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  isCommitted: boolean;
  commitHash?: string;
}

// 内部使用，包含完整路径用于扫描状态管理
interface InternalRepoChange extends RepoChange {
  _repoPath: string;  // 仅内部使用，不上报
}

// 状态文件路径
const STATE_FILE = join(os.homedir(), '.anti-work', 'scanner-state.json');

interface UncommittedStats {
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
}

interface ScannerState {
  // 每个仓库上次扫描到的最新 commit hash
  lastCommitHashes: Record<string, string>;
  // 每个仓库上次的 diff hash（用于检测未提交变更是否真的变化了）
  lastDiffHashes: Record<string, string>;
  // 每个仓库上次的未提交变更统计（用于计算增量）
  lastUncommittedStats: Record<string, UncommittedStats>;
}

/**
 * 加载扫描状态
 */
function loadState(): ScannerState {
  try {
    if (existsSync(STATE_FILE)) {
      const content = readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // 确保所有字段都存在（兼容旧版本状态文件）
      return {
        lastCommitHashes: parsed.lastCommitHashes || {},
        lastDiffHashes: parsed.lastDiffHashes || {},
        lastUncommittedStats: parsed.lastUncommittedStats || {},
      };
    }
  } catch {
    // 忽略错误
  }
  return { lastCommitHashes: {}, lastDiffHashes: {}, lastUncommittedStats: {} };
}

/**
 * 保存扫描状态
 */
function saveState(state: ScannerState): void {
  try {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // 忽略错误
  }
}

/**
 * 计算字符串的 hash
 */
function hashString(str: string): string {
  return createHash('md5').update(str).digest('hex').slice(0, 16);
}

/**
 * 查找目录下的所有 Git 仓库
 */
async function findGitRepos(basePath: string): Promise<string[]> {
  const repos: string[] = [];

  // 检查当前目录是否是 Git 仓库
  if (existsSync(join(basePath, '.git'))) {
    repos.push(basePath);
  }

  // 查找子目录中的 Git 仓库 (只查一层)
  const pattern = join(basePath, '*', '.git');
  const gitDirs = await glob(pattern, { dot: true });

  for (const gitDir of gitDirs) {
    const repoPath = gitDir.replace(/[/\\]\.git$/, '');
    if (!repos.includes(repoPath)) {
      repos.push(repoPath);
    }
  }

  return repos;
}

/**
 * 获取仓库的未提交变更统计（增量模式：只上报相比上次的正向增量）
 */
async function getUncommittedChanges(
  git: SimpleGit,
  repoPath: string,
  state: ScannerState
): Promise<InternalRepoChange | null> {
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

    // 获取当前 diff 的原始输出
    const diffOutput = await git.diff(['HEAD', '--stat']);

    // 获取上次的统计数据
    const lastStats = state.lastUncommittedStats[repoPath] || { linesAdded: 0, linesDeleted: 0, filesChanged: 0 };

    if (!diffOutput.trim()) {
      // 没有未提交变更，清除状态
      delete state.lastDiffHashes[repoPath];
      delete state.lastUncommittedStats[repoPath];
      return null;
    }

    // 计算当前 diff 的 hash
    const currentDiffHash = hashString(diffOutput);
    const lastDiffHash = state.lastDiffHashes[repoPath];

    // 如果 diff 内容没有变化，不上报
    if (currentDiffHash === lastDiffHash) {
      return null;
    }

    // diff 有变化，解析统计信息
    const diffSummary = await git.diffSummary(['HEAD']);
    const currentStats: UncommittedStats = {
      linesAdded: diffSummary.insertions,
      linesDeleted: diffSummary.deletions,
      filesChanged: diffSummary.files.length,
    };

    // 计算增量（只保留正向增量）
    const deltaAdded = Math.max(0, currentStats.linesAdded - lastStats.linesAdded);
    const deltaDeleted = Math.max(0, currentStats.linesDeleted - lastStats.linesDeleted);
    const deltaFiles = Math.max(0, currentStats.filesChanged - lastStats.filesChanged);

    // 更新状态（无论是否上报都要更新）
    state.lastDiffHashes[repoPath] = currentDiffHash;
    state.lastUncommittedStats[repoPath] = currentStats;

    // 只有正向增量时才上报
    if (deltaAdded === 0 && deltaDeleted === 0) {
      return null;
    }

    return {
      _repoPath: repoPath,  // 仅内部使用
      repoName: basename(repoPath),  // 只发送仓库名称
      branch: branch.trim(),
      linesAdded: deltaAdded,
      linesDeleted: deltaDeleted,
      filesChanged: deltaFiles,
      isCommitted: false,
    };
  } catch {
    return null;
  }
}

/**
 * 获取新的 commit 记录（只返回上次扫描后的新 commit）
 */
async function getNewCommits(
  git: SimpleGit,
  repoPath: string,
  state: ScannerState
): Promise<InternalRepoChange[]> {
  const changes: InternalRepoChange[] = [];

  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    const lastHash = state.lastCommitHashes[repoPath];

    // 获取 commit 列表
    let logOptions: Record<string, unknown>;

    if (lastHash) {
      // 获取 lastHash 之后的所有 commit
      try {
        // 检查 lastHash 是否还存在
        await git.show([lastHash, '--format=%H', '--quiet']);
        logOptions = { from: lastHash };
      } catch {
        // lastHash 不存在（可能被 rebase 或删除），获取最近 24 小时的 commit
        logOptions = { '--since': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      }
    } else {
      // 首次扫描，只获取最近 1 小时的 commit
      logOptions = { '--since': new Date(Date.now() - 60 * 60 * 1000).toISOString() };
    }

    const log = await git.log(logOptions);

    // 按时间顺序处理（旧的先处理）
    const commits = [...log.all].reverse();

    for (const commit of commits) {
      try {
        const show = await git.show([commit.hash, '--stat', '--format=']);
        const stats = parseGitStats(show);

        if (stats.filesChanged > 0) {
          changes.push({
            _repoPath: repoPath,  // 仅内部使用
            repoName: basename(repoPath),  // 只发送仓库名称
            branch: branch.trim(),
            linesAdded: stats.linesAdded,
            linesDeleted: stats.linesDeleted,
            filesChanged: stats.filesChanged,
            isCommitted: true,
            commitHash: commit.hash,
          });
        }

        // 更新最新的 commit hash
        state.lastCommitHashes[repoPath] = commit.hash;
      } catch {
        // 忽略单个 commit 的错误
      }
    }
  } catch {
    // 忽略错误
  }

  return changes;
}

/**
 * 解析 git show --stat 输出
 */
function parseGitStats(output: string): {
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
} {
  const lines = output.trim().split('\n');
  const summaryLine = lines[lines.length - 1];

  const match = summaryLine.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/
  );

  if (match) {
    return {
      filesChanged: parseInt(match[1]) || 0,
      linesAdded: parseInt(match[2]) || 0,
      linesDeleted: parseInt(match[3]) || 0,
    };
  }

  return { linesAdded: 0, linesDeleted: 0, filesChanged: 0 };
}

/**
 * 扫描所有仓库
 * 返回的 RepoChange 不包含完整路径，只包含仓库名称
 */
export async function scanRepositories(): Promise<RepoChange[]> {
  const config = getConfig();
  const allChanges: InternalRepoChange[] = [];
  const state = loadState();

  for (const watchPath of config.watchPaths) {
    if (!existsSync(watchPath)) {
      continue;
    }

    const stat = statSync(watchPath);
    if (!stat.isDirectory()) {
      continue;
    }

    try {
      const repos = await findGitRepos(watchPath);

      for (const repoPath of repos) {
        // 检查是否在排除列表中
        const repoName = basename(repoPath);
        if (config.excludePatterns.some((p) => repoName.includes(p) || repoPath.includes(p))) {
          continue;
        }

        try {
          const git = simpleGit(repoPath);

          // 获取新的 commits
          const commits = await getNewCommits(git, repoPath, state);
          allChanges.push(...commits);

          // 获取未提交变更（只有内容变化时才返回）
          const uncommitted = await getUncommittedChanges(git, repoPath, state);
          if (uncommitted) {
            allChanges.push(uncommitted);
          }
        } catch {
          // 忽略单个仓库的错误
        }
      }
    } catch {
      // 忽略错误
    }
  }

  // 保存状态
  saveState(state);

  // 移除内部字段，只返回安全的数据（不包含完整路径）
  return allChanges.map(({ _repoPath, ...change }) => change);
}
