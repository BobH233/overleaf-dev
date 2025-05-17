import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EditorCloneProjectModalWrapper from '../../clone-project-modal/components/editor-clone-project-modal-wrapper'
import ModalRemoveTempGitDir from './modal-remove-temp-git-dir'
import LeftMenuButton from './left-menu-button'
import { useLocation } from '../../../shared/hooks/use-location'
import * as eventTracking from '../../../infrastructure/event-tracking'
import githubIconPath from '../../../../../public/img/third-party-icons/github.svg'
import OLModal from '../../ui/components/ol/ol-modal'

export default function ActionRemoveTempGitDir() {
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
        {t('remove_temp_git_dir')}
      </LeftMenuButton>
      {showModal && (
        <OLModal show onHide={handleCloseModal}>
          <ModalRemoveTempGitDir
            onCancel={handleCloseModal}
            onSuccess={handleSuccess}
          />
        </OLModal>
      )}
    </>
  )
}
