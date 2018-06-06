import React from 'react'
import Link from 'gatsby-link'
import PropTypes from 'prop-types'

import styles from './styles.module.scss'
import config from '../../web-config'

class Pagination extends React.Component {
  render() {
    const { slug, pageCount, pageNo } = this.props
    const pageList = Array(pageCount)
      .fill()
      .map((value, index) => {
        const _pageNo = index + 1
        const className =
          _pageNo == pageNo ? 'pagination-link is-current' : 'pagination-link'

        if (_pageNo == 1) {
          return (
            <li key={index}>
              <Link className={className} to={`/blog/${slug}/`}>
                {_pageNo}
              </Link>
            </li>
          )
        } else {
          return (
            <li key={index}>
              <Link className={className} to={`/blog/${slug}/${_pageNo}/`}>
                {_pageNo}
              </Link>
            </li>
          )
        }
      })

    return (
      <nav className={`pagination is-centered ${styles.pagination}`}>
        <ul className="pagination-list">{pageList}</ul>
      </nav>
    )
  }
}

Pagination.propTypes = {
  slug: PropTypes.string.isRequired,
  pageCount: PropTypes.number.isRequired,
  pageNo: PropTypes.number.isRequired,
}

export default Pagination
