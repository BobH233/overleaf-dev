import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useAsync from '../../../shared/hooks/use-async'
import {
	getUserFacingMessage,
	postJSON,
	getJSON,
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
	const [isConfigFileValid, setIsConfigFileValid] = useState<boolean | null>(null)
	const [failReason, setFailReason] = useState('')
	const { isLoading, isError, error, runAsync } = useAsync<void>()
	const {
		_id: projectId,
		name: projectName,
		tags: projectTags,
	} = useProjectContext()

	useEffect(() => {
		// Check if the GitHub sync config file exists
		if (projectId) {
			getJSON(`/project/${projectId}/github-sync/check-config`)
				.then((response) => {
					setIsConfigFileValid(response.ifConfigFileValid)
					setFailReason(response.fail_reason)
				})
				.catch(() => {
					setIsConfigFileValid(false) // Default to false on error
				})
		}
	}, [projectId])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		// runAsync(
		// 	postJSON(`/project/${projectId}/sync-github`, {
		// 		body: {
		// 			message: commitMessage,
		// 		},
		// 	})
		// )
		// 	.then(() => {
		// 		if (onSuccess) onSuccess()
		// 	})
		// 	.catch(() => {})
	}

	const handleChangeMessage = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setCommitMessage(e.currentTarget.value)
	}

	if (isConfigFileValid === null || !projectName) {
		// Wait for the config check or project context to load
		return null
	}

	if (!isConfigFileValid) {
		// Show the configuration prompt if the config file does not exist
		return (
			<>
				<OLModalHeader closeButton>
					<OLModalTitle>{t('github_sync_configuration_required')}</OLModalTitle>
				</OLModalHeader>

				<OLModalBody>
					<p>{t('github_sync_config_instructions')}</p>
					<a
						href="https://example.com/github-sync-config"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('learn_more_about_github_sync_config_file')}
					</a>
					<p
						style={{ marginTop: '16px' }}
					>
        		<strong>{t('github_sync_config_file_fail_reason_is')}</strong> {t(failReason)}
    			</p>
				</OLModalBody>

				<OLModalFooter>
					<OLButton variant="secondary" onClick={onCancel}>
						{t('cancel')}
					</OLButton>
				</OLModalFooter>
			</>
		)
	}

	// Show the sync form if the config file exists
	return (
		<>
			<OLModalHeader closeButton>
				<OLModalTitle>{t('push_project_to_github')}</OLModalTitle>
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
						placeholder={t('github_commit_message_placeholder')}
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

export default ModalSyncWithGithubForm
