import { useTranslation } from 'react-i18next'
import MaterialIcon from '@/shared/components/material-icon'
import { useIsNewEditorEnabled } from '@/features/ide-redesign/utils/new-editor-utils'

function FileTreeFolderIcons({
  expanded,
  onExpandCollapseClick,
}: {
  expanded: boolean
  onExpandCollapseClick: () => void
}) {
  const { t } = useTranslation()
  const newEditor = useIsNewEditorEnabled()

  if (newEditor) {
    return (
      <>
        <button
          className="folder-expand-collapse-button"
          onClick={onExpandCollapseClick}
          aria-label={expanded ? t('collapse') : t('expand')}
        >
          <MaterialIcon
            type={expanded ? 'expand_more' : 'chevron_right'}
            className="file-tree-expand-icon"
          />
        </button>
      </>
    )
  }

  return (
    <>
      <button
        onClick={onExpandCollapseClick}
        aria-label={expanded ? t('collapse') : t('expand')}
      >
        <MaterialIcon
          type={expanded ? 'expand_more' : 'chevron_right'}
          className="file-tree-expand-icon"
        />
      </button>
      <MaterialIcon
        type={expanded ? 'folder_open' : 'folder'}
        className="file-tree-folder-icon"
      />
    </>
  )
}

export default FileTreeFolderIcons
