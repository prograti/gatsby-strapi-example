import React from 'react'
import PropTypes from 'prop-types'
import Link from 'gatsby-link'

import styles from './styles.module.scss'

const Tag = ({ tags }) => {
  const taglink = tags.map(tag => (
    <Link className="tag is-link" to={`/tag/${tag.slug}/`} key={tag.id}>
      {tag.name}
    </Link>
  ))
  return <div className={styles.tags}>{taglink}</div>
}

Tag.propTypes = {
  tags: PropTypes.array.isRequired,
}

export default Tag
