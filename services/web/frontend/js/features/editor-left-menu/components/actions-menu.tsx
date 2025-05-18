import { ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import getMeta from '../../../utils/meta'
import importOverleafModules from '../../../../macros/import-overleaf-module.macro'
import ActionsCopyProject from './actions-copy-project'
import ActionsWordCount from './actions-word-count'
import ActionSyncGithub from './action-sync-github'
import ActionRemoveTempGitDir from './action-remove-temp-git-dir'

const components = importOverleafModules('editorLeftMenuManageTemplate') as {
  import: { default: ElementType }
  path: string
}[]

export default function ActionsMenu() {
  const { t } = useTranslation()
  const anonymous = getMeta('ol-anonymous')

  if (anonymous) {
    return null
  }

  return (
    <>
      <h4>{t('actions')}</h4>
      <ul className="list-unstyled nav">
        <li>
          <ActionsCopyProject />
        </li>
        {components.map(({ import: { default: Component }, path }) => (
          <li key={path}>
            <Component />
          </li>
        ))}
        <li>
          <ActionsWordCount />
        </li>
      </ul>
      <h4>{t('sync')}</h4>
      <ul className="list-unstyled nav">
        <li>
          <ActionSyncGithub />
        </li>
      </ul>
      <ul className="list-unstyled nav">
        <li>
          <ActionRemoveTempGitDir />
        </li>
      </ul>
    </>
  )
}
