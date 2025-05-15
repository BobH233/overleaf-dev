import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EditorCloneProjectModalWrapper from '../../clone-project-modal/components/editor-clone-project-modal-wrapper'
import LeftMenuButton from './left-menu-button'
import { useLocation } from '../../../shared/hooks/use-location'
import * as eventTracking from '../../../infrastructure/event-tracking'
import githubIconPath from '../../../../../public/img/third-party-icons/github.svg'

type ProjectCopyResponse = {
  project_id: string
}

export default function ActionSyncGithub() {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()
  const location = useLocation()

  const openProject = useCallback(
    ({ project_id: projectId }: ProjectCopyResponse) => {
      location.assign(`/project/${projectId}`)
    },
    [location]
  )

  const handleShowModal = useCallback(() => {
    eventTracking.sendMB('left-menu-copy')
    setShowModal(true)
  }, [])

  return (
    <>
      <LeftMenuButton onClick={handleShowModal} svgIcon={<img src={githubIconPath} alt="GitHub" width="20" height="20" />}>
        {t('sync_with_github')}
      </LeftMenuButton>
      <EditorCloneProjectModalWrapper
        show={showModal}
        handleHide={() => setShowModal(false)}
        openProject={openProject}
      />
    </>
  )
}
