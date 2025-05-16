import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useAsync from '../../../shared/hooks/use-async'
import {
	getUserFacingMessage,
	postJSON,
} from '../../../infrastructure/fetch-json'
import Notification from '../../../shared/components/notification'
import {
	OLModalBody,
	OLModalFooter,
	OLModalHeader,
	OLModalTitle,
} from '../../ui/components/ol/ol-modal'
import OLFormControl from '../../ui/components/ol/ol-form-control'
import OLButton from '../../ui/components/ol/ol-button'
import OLForm from '../../ui/components/ol/ol-form'
import { useProjectContext } from '../../../shared/context/project-context'

type Props = {
	onCancel: () => void
	onSuccess?: () => void
}

function ModalSyncWithGithubForm({ onCancel, onSuccess }: Props) {
	const { t } = useTranslation()
	const [commitMessage, setCommitMessage] = useState('')
	const { isLoading, isError, error, runAsync } = useAsync<void>()
	const {
		_id: projectId,
		name: projectName,
		tags: projectTags,
	} = useProjectContext()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		console.log("!!!!projectid:", projectId);
		// runAsync(
		//   postJSON(`/project/${projectId}/sync-github`, {
		//     body: {
		//       message: commitMessage,
		//     },
		//   })
		// )
		//   .then(() => {
		//     if (onSuccess) onSuccess()
		//   })
		//   .catch(() => {})
	}

	const handleChangeMessage = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setCommitMessage(e.currentTarget.value)
	}
	if (!projectName) {
		// wait for useProjectContext
		return null
	} else {
		return (
			<>
				<OLModalHeader closeButton>
					<OLModalTitle>{t('sync_with_github')}</OLModalTitle>
				</OLModalHeader>

				<OLModalBody>
					{isError && (
						<div className="notification-list">
							<Notification
								type="error"
								content={getUserFacingMessage(error) as string}
							/>
						</div>
					)}
					<OLForm onSubmit={handleSubmit}>
						<OLFormControl
							as="textarea"
							rows={6}
							placeholder={t('commit_message_placeholder')}
							onChange={handleChangeMessage}
							value={commitMessage}
						/>
					</OLForm>
				</OLModalBody>

				<OLModalFooter>
					<OLButton variant="secondary" onClick={onCancel}>
						{t('cancel')}
					</OLButton>
					<OLButton
						variant="primary"
						onClick={handleSubmit}
						disabled={commitMessage.trim() === '' || isLoading}
						isLoading={isLoading}
					>
						{t('sync')}
					</OLButton>
				</OLModalFooter>
			</>
		)
	}
}

export default ModalSyncWithGithubForm
