import { FC, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { Logo } from '../icons/Logo'

import st from './AppBootstrap.sass'

const AppBootstrap: FC = () => {
  const [status, setStatus] = useState<string | null>('checking-for-update')
  const [progress, setProgress] = useState<string | null>(null)
  const { t } = useTranslation()
  useEffect(() => {
    window.appAPI.on('status', setStatus)
    window.appAPI.on('progress', setProgress)
    window.appAPI.on('nowPlayingChanged', console.log)
    window.appAPI.ready()
  }, [])
  return <div className={st.bootstrap}>
    <div className={st.header}>
      <div className={st.movable} />
    </div>
    <div className={st.main}>
      <div className={st.name}>
      <Logo className={st.logo} />
    </div>
      <div className={st.status}>
        {t(`status.${status}`)}
        {status === 'downloading' && <div className={st.progress}>
          <div className={st.current} style={{ width: `${progress}%` }} />
        </div>}
      </div>
    </div>
  </div>
}

ReactDOM.createRoot(document.getElementsByTagName('root')[0]).render(<AppBootstrap />)