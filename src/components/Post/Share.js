import React from 'react'
import PropTypes from 'prop-types'
import {
  FacebookShareButton,
  GooglePlusShareButton,
  TwitterShareButton,
  FacebookShareCount,
  GooglePlusShareCount,
  FacebookIcon,
  TwitterIcon,
  GooglePlusIcon,
} from 'react-share'

import styles from './styles.module.scss'
import config from '../../web-config'

class PostShare extends React.Component {
  render() {
    const { post } = this.props
    const { title, description, slug } = post
    const url = config.siteUrl + '/blog/' + slug

    const iconSize = 36
    const filter = count => (count > 0 ? count : '')

    return (
      <div className={styles.socialShare}>
        <FacebookShareButton
          url={url}
          quote={`${title} - ${description}`}
          aria-label="Facebook share"
        >
          <FacebookIcon round size={iconSize} />
          <FacebookShareCount url={url}>
            {count => <div className={styles.shareCount}>{filter(count)}</div>}
          </FacebookShareCount>
        </FacebookShareButton>
        <TwitterShareButton url={url} title={title}>
          <TwitterIcon round size={iconSize} />
        </TwitterShareButton>
        <GooglePlusShareButton url={url}>
          <GooglePlusIcon round size={iconSize} />
          <GooglePlusShareCount url={url}>
            {count => <div className={styles.shareCount}>{filter(count)}</div>}
          </GooglePlusShareCount>
        </GooglePlusShareButton>
      </div>
    )
  }
}

PostShare.propTypes = {
  post: PropTypes.object.isRequired,
}

export default PostShare
