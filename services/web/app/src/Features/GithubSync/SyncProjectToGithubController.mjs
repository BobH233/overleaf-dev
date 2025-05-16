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

const DEBUG_REPO_NAME = ''
const DEBUG_GITHUB_USERNAME = ''
const DEBUG_GITHUB_TOKEN = ''
const DEBUG_COMMIT_USER = ''
const DEBUG_COMMIT_EMAIL = ''



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
    const projectId = req.params.Project_id
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempDir = path.join('/tmp/ol_github_sync', `github-sync-${projectId}-${timestamp}`)
    const tempGitDir = path.join('/tmp/ol_github_sync', `github-sync-${projectId}-${timestamp}-git`)
    // 1. Make temporary directory for GitHub repository
    try {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log(`Temporary directory created at: ${tempDir}`)
    } catch (err) {
      console.error(`Failed to create temporary directory: ${err.message}`)
      return res.status(500).send('Error creating temporary directory')
    }

    // 2. Copy all project files and docs to the temporary directory
    async.parallel([
      cb => SyncProjectToGithubController.copyAllFilesToTempDir(projectId, tempDir, cb),
      cb => SyncProjectToGithubController.copyAllDocsToTempDir(projectId, tempDir, cb)
    ], err => {
      if (err) {
        console.error(`Error copying project content: ${err.message}`)
        return res.status(500).send('Error copying project content')
      }

      console.log('All files and docs copied successfully')

      // 3. Initialize the Git repository
      try {
        fs.mkdirSync(tempGitDir, { recursive: true });
        console.log(`Temporary Git directory created at: ${tempGitDir}`);
      } catch (err) {
        console.error(`Failed to create temporary Git directory: ${err.message}`);
        return res.status(500).send('Error creating temporary Git directory');
      }

      const git = simpleGit(tempGitDir)
      const remoteUrl = `https://${DEBUG_GITHUB_TOKEN}@github.com/${DEBUG_GITHUB_USERNAME}/${DEBUG_REPO_NAME}.git`;
      
      git.clone(remoteUrl, tempGitDir, ['--no-checkout'])
        .then(() => {
          // sync copy all the files from tempDir to the cloned repo
          copyDirSync(tempDir, tempGitDir);
          console.log('Files copied to cloned repository');
          return git.addConfig('user.email', DEBUG_COMMIT_EMAIL);
        })
        .then(() => git.addConfig('user.name', DEBUG_COMMIT_USER))
        .then(() => {
          return git.add('./*'); // 添加现有文件
        })
        .then(() => git.commit('Sync changes from Overleaf project'))
        .then(() => git.push('origin', 'main'))
        .then(() => res.status(200).send('Project synced to GitHub successfully'))
        .catch(err => {
          console.error(`Failed to sync with remote repository: ${err.message}`);
          res.status(500).send('Error syncing with remote repository');
        });

      // 4. Commit the changes and push to the remote repository (placeholder for now)

      // 5. Delete the temporary directory
      // fs.rmSync(tempDir, { recursive: true }, err => {
      //   if (err) {
      //     console.error(`Failed to delete temporary directory: ${err.message}`)
      //     return res.status(500).send('Error deleting temporary directory')
      //   }
      //   console.log(`Temporary directory deleted: ${tempDir}`)
      // })
      
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