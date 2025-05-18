import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EditorCloneProjectModalWrapper from '../../clone-project-modal/components/editor-clone-project-modal-wrapper'
import ModalSyncWithGithubForm from './modal-sync-with-github-commit'
import LeftMenuButton from './left-menu-button'
import { useLocation } from '../../../shared/hooks/use-location'
import * as eventTracking from '../../../infrastructure/event-tracking'
import githubIconPath from '../../../../../public/img/third-party-icons/github.svg'
import OLModal from '../../ui/components/ol/ol-modal'

export default function ActionSyncGithub() {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()


  const handleCloseModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const handleShowModal = useCallback(() => {
    eventTracking.sendMB('left-menu-copy')
    setShowModal(true)
  }, [])

  const handleSuccess = () => {
    setShowModal(false)
  }

  return (
    <>
      <LeftMenuButton onClick={handleShowModal} svgIcon={<img src={githubIconPath} alt="GitHub" width="20" height="20" />}>
        {t('push_project_to_github')}
      </LeftMenuButton>
      {showModal && (
        <OLModal show onHide={handleCloseModal}>
          <ModalSyncWithGithubForm
            onCancel={handleCloseModal}
            onSuccess={handleSuccess}
          />
        </OLModal>
      )}
    </>
  )
}
