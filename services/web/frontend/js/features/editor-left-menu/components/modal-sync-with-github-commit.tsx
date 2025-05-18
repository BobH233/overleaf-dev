import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useAsync from '../../../shared/hooks/use-async'
import {
	getUserFacingMessage,
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
import getMeta from '../../../utils/meta'

type Props = {
	onCancel: () => void
	onSuccess?: () => void
}

function ModalSyncWithGithubForm({ onCancel, onSuccess }: Props) {
	const { t } = useTranslation()
	const [commitMessage, setCommitMessage] = useState('')
	const [isConfigFileValid, setIsConfigFileValid] = useState<boolean | null>(null)
	const [failReason, setFailReason] = useState('')
	const [isSyncing, setIsSyncing] = useState(false)
	const [logs, setLogs] = useState<string[]>([])
	const [isStreamComplete, setIsStreamComplete] = useState(false)
	const logContainerRef = useRef<HTMLDivElement>(null)
	const { isLoading, isError, error } = useAsync<void>()
	const {
		_id: projectId,
		name: projectName,
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!projectId || commitMessage.trim() === '') return

		setIsSyncing(true)
		setLogs([])
		setIsStreamComplete(false)

		try {
			const response = await fetch(`/project/${projectId}/github-sync/push`, {
				method: 'POST',
				headers: {
					'X-CSRF-TOKEN': getMeta('ol-csrfToken'),
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ commit_message: commitMessage }),
			})

			if (!response.ok) {
				throw new Error('Failed to initiate sync process')
			}

			const reader = response.body?.getReader()
			const decoder = new TextDecoder()

			if (reader) {
				let done = false
				while (!done) {
					const { value, done: readerDone } = await reader.read()
					done = readerDone
					if (value) {
						const chunk = decoder.decode(value, { stream: true })
						const lines = chunk.split('\n').map((line) => line.replace(/^data: /, '').trim())
						setLogs((prevLogs) => [...prevLogs, ...lines])
						if (logContainerRef.current) {
							logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
						}
					}
				}
			}

			setIsStreamComplete(true)
		} catch (error) {
			console.error('Error during sync:', error)
			setLogs((prevLogs) => [...prevLogs, 'Error during sync process.'])
			setIsStreamComplete(true)
		} finally {
			setIsSyncing(false)
		}
	}

	const handleChangeMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
						href=""
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('learn_more_about_github_sync_config_file')}
					</a>
						<p style={{ marginTop: '16px' }}>
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
				{(!isSyncing && !isStreamComplete) && (
					<OLForm onSubmit={handleSubmit}>
						<OLFormControl
							as="textarea"
							rows={6}
							placeholder={t('github_commit_message_placeholder')}
							onChange={handleChangeMessage}
							value={commitMessage}
						/>
					</OLForm>
				)}
				{(isSyncing || isStreamComplete) && (
					<div
						ref={logContainerRef}
						style={{
							height: '200px',
							overflowY: 'auto',
							backgroundColor: '#f5f5f5',
							padding: '10px',
							border: '1px solid #ddd',
							borderRadius: '4px',
							marginTop: '10px',
							fontFamily: 'monospace',
							whiteSpace: 'pre-wrap',
							lineHeight: '1.2',
						}}
					>
						{logs.map((log, index) => (
							<div key={index}>{log}</div>
						))}
					</div>
				)}
			</OLModalBody>

			<OLModalFooter>
				{!isSyncing && (
					<OLButton variant="secondary" onClick={onCancel}>
						{t('cancel')}
					</OLButton>
				)}
				{isSyncing && isStreamComplete && (
					<OLButton variant="primary" onClick={onCancel}>
						{t('ok')}
					</OLButton>
				)}
				{!isStreamComplete && (
					<OLButton
						variant="primary"
						onClick={handleSubmit}
						disabled={commitMessage.trim() === '' || isSyncing}
						isLoading={isSyncing}
					>
						{t('sync')}
					</OLButton>
				)}
			</OLModalFooter>
		</>
	)
}

export default ModalSyncWithGithubForm
