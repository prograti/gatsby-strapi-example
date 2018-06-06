import React from 'react'

import avatar from '../../images/avatar.jpg'
import twitter from '../../images/twitter.png'
import github from '../../images/github.png'
import qiita from '../../images/qiita.png'
import styles from './styles.module.scss'
import config from '../../web-config'

const Sidebar = () => (
  <aside>
    <div className={styles.avatar}>
      <img src={avatar} alt="prograti" />
    </div>
    <h1>{config.authorName}</h1>
    <p className={styles.profile}>{config.authorProfile}</p>
    <nav>
      <ul className={styles.social}>
        <li>
          <a href={config.authorSocialLinks.twitter} title="my twitter account">
            <img src={twitter} alt="my twitter account" />
          </a>
        </li>
        <li>
          <a href={config.authorSocialLinks.github} title="my github account">
            <img src={github} alt="my github account" />
          </a>
        </li>
        <li>
          <a href={config.authorSocialLinks.qiita} title="my qiita account">
            <img src={qiita} alt="my qiita account" />
          </a>
        </li>
      </ul>
    </nav>
  </aside>
)

export default Sidebar
