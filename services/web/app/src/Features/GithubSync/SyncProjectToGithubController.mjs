import Metrics from '@overleaf/metrics'
import ProjectGetter from '../Project/ProjectGetter.js'
import DocumentUpdaterHandler from '../DocumentUpdater/DocumentUpdaterHandler.js'
import ProjectEntityHandler from '../Project/ProjectEntityHandler.js'
import FileStoreHandler from '../FileStore/FileStoreHandler.js'
import fs from 'fs'
import path from 'path'
import async from 'async'

const SyncProjectToGithubController  = {
  syncProjectToGithub(req, res, next) {
    const projectId = req.params.Project_id
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const tempDir = path.join('/tmp/ol_github_sync', `github-sync-${projectId}-${timestamp}`)
    
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

      // 3. Initialize the Git repository (placeholder for now)

      // 4. Commit the changes and push to the remote repository (placeholder for now)

      // 5. Delete the temporary directory
      // fs.rmSync(tempDir, { recursive: true }, err => {
      //   if (err) {
      //     console.error(`Failed to delete temporary directory: ${err.message}`)
      //     return res.status(500).send('Error deleting temporary directory')
      //   }
      //   console.log(`Temporary directory deleted: ${tempDir}`)
      // })

      // 6. Respond with success message
      res.status(200).send('Project synced to GitHub successfully')
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