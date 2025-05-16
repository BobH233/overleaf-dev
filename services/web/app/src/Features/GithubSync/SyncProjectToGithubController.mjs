import Metrics from '@overleaf/metrics'
import ProjectGetter from '../Project/ProjectGetter.js'
import DocumentUpdaterHandler from '../DocumentUpdater/DocumentUpdaterHandler.js'
import ProjectEntityHandler from '../Project/ProjectEntityHandler.js'
import FileStoreHandler from '../FileStore/FileStoreHandler.js'
import fs from 'fs'
import path from 'path'
import async from 'async'
import simpleGit from 'simple-git';


const CACHE_GIT_REPO_DIR = '/overleaf/cache/github-sync'


function copyDirSync(src, dest) {
  // 确保目标文件夹存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // 遍历源目录的内容
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 如果是文件夹递归复制
      copyDirSync(srcPath, destPath);
    } else {
      // 如果是文件直接复制
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

const SyncProjectToGithubController = {
  syncProjectToGithub(req, res, next) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sendLog = (msg) => {
      res.write(`data: ${msg}\n\n`);
    };

    const projectId = req.params.Project_id
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempDir = path.join('/tmp/ol_github_sync', `github-sync-${projectId}-${timestamp}`)
    const tempGitDir = path.join('/tmp/ol_github_sync', `github-sync-${projectId}-${timestamp}-git`)
    let syncConfigJson = {}
    sendLog('Start sync to github...');
    // temporary directory for GitHub repository
    try {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log(`Temporary directory created at: ${tempDir}`)
      sendLog('Temperary project directory created.');
    } catch (err) {
      console.error(`Failed to create temporary directory: ${err.message}`)
      sendLog('Error creating temporary directory');
      return res.end();
    }

    // Copy all project files and docs to the temporary directory
    async.parallel([
      cb => SyncProjectToGithubController.copyAllFilesToTempDir(projectId, tempDir, cb),
      cb => SyncProjectToGithubController.copyAllDocsToTempDir(projectId, tempDir, cb)
    ], err => {
      if (err) {
        console.error(`Error copying project content: ${err.message}`)
        sendLog('Error copying project content');
        return res.end();
      }
      sendLog('All files and docs copied successfully');
      console.log('All files and docs copied successfully')



      // read and check privacy file
      const privacyFilePath = path.join(tempDir, '.github-sync-config.json')
      if (!fs.existsSync(privacyFilePath)) {
        console.error(`Privacy file not found: ${privacyFilePath}`)
        sendLog('Github sync config file not found!');
        return res.end();
      }
      try {
        // read and parse the privacy file
        const privacyFileContent = fs.readFileSync(privacyFilePath, 'utf-8')
        syncConfigJson = JSON.parse(privacyFileContent)
        // check properties existence
        if (!syncConfigJson.commit_username || !syncConfigJson.github_token || !syncConfigJson.commit_email || !syncConfigJson.repo_https_url) {
          console.error('Missing required properties in privacy file')
          sendLog('Missing required properties in github sync config file');
          return res.end();
        }
      } catch (err) {
        console.error(`Failed to read or parse privacy file: ${err.message}`)
        sendLog('Error reading or parsing privacy file');
        return res.end();
      }

      // Initialize the Git repository
      try {
        fs.mkdirSync(tempGitDir, { recursive: true });
        console.log(`Temporary Git directory created at: ${tempGitDir}`);
      } catch (err) {
        console.error(`Failed to create temporary Git directory: ${err.message}`);
        sendLog('Failed to create temporary Git directory');
        return res.end();
      }

      const git = simpleGit(tempGitDir)
      const remoteUrl = syncConfigJson.repo_https_url.replace('https://', `https://${syncConfigJson.github_token}@`);

      sendLog('Cloning remote repository...');
      git.clone(remoteUrl, tempGitDir, ['--no-checkout', '--depth=1'])
        .then(() => {
          sendLog('Copying files to cloned repository...');
          // sync copy all the files from tempDir to the cloned repo
          copyDirSync(tempDir, tempGitDir);
          const privacy_file_path = path.join(tempGitDir, '.github-sync-config.json');
          if (fs.existsSync(privacy_file_path)) {
            fs.unlinkSync(privacy_file_path);
          }
          console.log('Files copied to cloned repository');
          sendLog('Committing changes...');
          return git.addConfig('user.email', syncConfigJson.commit_email);
        })
        .then(() => git.addConfig('user.name', syncConfigJson.commit_username))
        .then(() => {
          return git.add('./*'); // 添加现有文件
        })
        .then(() => git.commit('Sync changes from Overleaf project'))
        .then(() => {
          sendLog('Pushing changes to remote repository...');
          return git.push('origin', 'main')
        })
        .then(() => {
          sendLog('Successfully synced with remote repository');
          res.end();
        })
        .catch(err => {
          console.error(`Failed to sync with remote repository: ${err.message}`);
          sendLog('Failed to sync with remote repository!');
          res.end();
        });
    })
  },

  copyAllFilesToTempDir(projectId, tempDir, callback) {
    ProjectEntityHandler.getAllFiles(projectId, (error, files) => {
      if (error) {
        return callback(error)
      }

      const fileJobs = Object.entries(files).map(([relativePath, file]) => cb => {
        const filePath = path.join(tempDir, relativePath)
        const dirPath = path.dirname(filePath)

        // Ensure the directory exists
        fs.mkdirSync(dirPath, { recursive: true })

        // Get the file stream and write it to the temporary directory
        FileStoreHandler.getFileStream(projectId, file._id, {}, (err, stream) => {
          if (err) {
            console.error(`Failed to get file stream for ${relativePath}: ${err.message}`)
            return cb(err)
          }

          const writeStream = fs.createWriteStream(filePath)
          stream.pipe(writeStream)
          writeStream.on('finish', () => {
            console.log(`File written: ${filePath}`)
            cb()
          })
          writeStream.on('error', cb)
        })
      })

      async.parallelLimit(fileJobs, 5, callback)
    })
  },

  copyAllDocsToTempDir(projectId, tempDir, callback) {
    ProjectEntityHandler.getAllDocs(projectId, (error, docs) => {
      if (error) {
        return callback(error)
      }

      const docJobs = Object.entries(docs).map(([relativePath, doc]) => cb => {
        const filePath = path.join(tempDir, relativePath)
        const dirPath = path.dirname(filePath)

        // Ensure the directory exists
        fs.mkdirSync(dirPath, { recursive: true })

        // Write the document content to the temporary directory
        fs.writeFile(filePath, doc.lines.join('\n'), err => {
          if (err) {
            console.error(`Failed to write doc to ${filePath}: ${err.message}`)
            return cb(err)
          }
          console.log(`Doc written: ${filePath}`)
          cb()
        })
      })

      async.parallelLimit(docJobs, 5, callback)
    })
  }
}

export default SyncProjectToGithubController