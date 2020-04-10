import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';

import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';

/** Get the expected file extension for the cr binary. */
function getExecutableExtension() {
  if (os.type().match(/^Win/)) {
    return '.exe';
  } else {
    return '';
  }
}

/** Get the download URL of the cr binary for the host running the action. */
function getDownloadUrl(version) {
  const downloadPattern = 'https://github.com/helm/chart-releaser/releases/download/%s/chart-releaser_%s_%s';

  switch (os.type()) {
    case 'Linux':
      return util.format(downloadPattern, version, version, 'linux_amd64.tar.gz');
    case 'Darwin':
      return util.format(downloadPattern, version, version, 'darwin_amd64.tar.gz');
    default:
      return util.format(downloadPattern, version, version, 'windows_amd64.zip');
  }
}

/** Get the tag of the latest available chart-releaser version. */
async function getLatestVersion() {
  const latestReleaseUrl = 'https://api.github.com/repos/helm/chart-releaser/releases/latest';

  return toolCache.downloadTool(latestReleaseUrl).then((downloadPath) => {
    const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
    return response.tag_name;
  }, (error) => {
    core.debug(error);
    throw new Error(`Failed to get latest version of chart-releaser from ${latestReleaseUrl}`);
  });
}

/** Walk a directory, collecting paths to all files with a given name. */
function walkSync(dir, fileList, fileToFind) {
  const files = fs.readdirSync(dir);
  fileList = fileList || [];
  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = walkSync(path.join(dir, file), fileList, fileToFind);
    } else {
      core.debug(file);
      if (file == fileToFind) {
        fileList.push(path.join(dir, file));
      }
    }
  });
  return fileList;
}

/** Find the chart-releaser executable in a directory tree. */
function findExecutable(rootFolder) {
  fs.chmodSync(rootFolder, '777');
  var fileList = [];
  const executableName = 'cr' + getExecutableExtension();
  walkSync(rootFolder, fileList, executableName);
  if (!fileList) {
    throw new Error(`${executableName} executable not found in path ${rootFolder}`);
  } else {
    return fileList[0];
  }
}

/** Download a specific version of chart-releaser. */
async function downloadChartReleaser(version) {
  const toolName = 'chart-releaser';

  let cachedToolPath = toolCache.find(toolName, version);
  if (!cachedToolPath) {
    const downloadUrl = getDownloadUrl(version);
    let downloadPath;
    try {
      downloadPath = await toolCache.downloadTool(downloadurl);
    } catch (exception) {
      core.debug(exception);
      throw new Error(`Failed to download chart-releaser from ${downloadUrl}`));
    }

    fs.chmodSync(downloadPath, '777');
    let unzippedPath;
    switch (os.type()) {
      case 'Linux':
      case 'Darwin':
        unzippedPath = await toolCache.extractTar(downloadPath);
        break;
      default:
        unzippedPath = await toolCache.extractZip(downloadPath);
    }
    cachedToolPath = await toolCache.cacheDir(unzippedPath, toolName, version);
  }

  const executablePath = findExecutable(cachedToolPath);
  fs.chmodSync(executablePath, '777');
  return executablePath;
}

async function run() {
  let version = core.getInput('version', { 'required': true });
  if (version.toLocaleLowerCase() === 'latest') {
    version = await getLatestVersion();
  }

  let executablePath = await downloadChartReleaser(version);
  let executableDir = path.dirname(executablePath);

  if (!process.env['PATH'].startsWith(executableDir)) {
    core.addPath(executableDir);
  }

  console.log(`Helm tool version ${version} has been cached at ${executablePath}`);
  core.setOutput('chart-releaser-path', executablePath);
}

run().catch(core.setFailed);
