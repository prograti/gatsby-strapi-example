import React from 'react'
import PropTypes from 'prop-types'

import PostShare from './Share.js'
import Pagination from './Pagination.js'
import styles from './styles.module.scss'

class Post extends React.Component {
  componentDidMount() {
    let observer = new IntersectionObserver(
      (entries, self) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.src = entry.target.dataset.src
            self.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: '300px 0px',
        threshold: 0,
      }
    )
    const images = document.querySelectorAll('.lazyload')
    images.forEach(image => observer.observe(image))
  }

  render() {
    const { data } = this.props

    return (
      <main className={styles.post}>
        <article>
          <div className={styles.postedAt}>{data.post.fields.postedAt}</div>
          <h1>{data.post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: data.markdown.html }} />
          <Pagination
            slug={data.post.slug}
            pageCount={data.post.fields.pageCount}
            pageNo={data.markdown.fields.pageNo}
          />
          <PostShare post={data.post} />
        </article>
      </main>
    )
  }
}

Post.propTypes = {
  data: PropTypes.object.isRequired,
}

export default Post
