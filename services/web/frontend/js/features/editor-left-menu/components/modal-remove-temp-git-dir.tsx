import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '../../ui/components/ol/ol-modal'
import OLButton from '../../ui/components/ol/ol-button'
import { useProjectContext } from '../../../shared/context/project-context'
import getMeta from '../../../utils/meta'

type Props = {
  onCancel: () => void
  onSuccess?: () => void
}

function ModalRemoveTempGitDir({ onCancel, onSuccess }: Props) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { _id: projectId } = useProjectContext()

  const handleDelete = async () => {
    if (!projectId) return
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/project/${projectId}/github-sync/remove-temp-git-dir`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': getMeta('ol-csrfToken'),
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to remove temporary Git directory')
      }
      if (onSuccess) onSuccess()
      onCancel()
    } catch (err) {
      setError(t('github_remove_temp_git_dir_error') || 'Error removing temporary Git directory')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <OLModalHeader closeButton>
        <OLModalTitle>{t('remove_temp_git_dir')}</OLModalTitle>
      </OLModalHeader>
      <OLModalBody>
        <p>{t('remove_temp_git_dir_confirm_message')}</p>
        {error && (
          <div style={{ color: 'red', marginTop: 8 }}>{error}</div>
        )}
      </OLModalBody>
      <OLModalFooter>
        <OLButton variant="secondary" onClick={onCancel} disabled={isDeleting}>
          {t('cancel')}
        </OLButton>
        <OLButton
          variant="danger"
          onClick={handleDelete}
          isLoading={isDeleting}
        >
          {t('delete')}
        </OLButton>
      </OLModalFooter>
    </>
  )
}

export default ModalRemoveTempGitDir