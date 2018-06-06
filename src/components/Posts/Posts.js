import React from 'react'
import Link from 'gatsby-link'
import PropTypes from 'prop-types'
import { chunk } from 'lodash'

import Tag from './Tag.js'
import styles from './styles.module.scss'

class Posts extends React.Component {
  render() {
    const { data } = this.props
    let posts = data.posts.edges
    let thumbnails = []
    data.thumbnails.edges.forEach(
      thumbnail => (thumbnails[thumbnail.node.fields.slug] = thumbnail)
    )

    if (data.tag) {
      const ids = data.tag.posts.map(post => post.id)
      posts = posts.filter(post => ids.includes(post.node.id))
    }

    const columns = posts.map(post => (
      <article className="column is-one-third" key={post.node.id}>
        <div className={styles.thumbnail}>
          <Link to={`/blog/${post.node.slug}/`} title={post.node.title}>
            <img
              src={thumbnails[post.node.slug].node.resolutions.src}
              alt={post.node.title}
            />
          </Link>
        </div>
        <div className={styles.postedAt}>
          <span>{post.node.fields.postedAt}</span>
        </div>
        <h1>
          <Link to={`/blog/${post.node.slug}/`}>{post.node.title}</Link>
        </h1>
        <Tag tags={post.node.tags} />
        <p>
          <Link to={`/blog/${post.node.slug}/`} title={post.node.title}>
            {post.node.description}
          </Link>
        </p>
      </article>
    ))

    const chunkOfColumns = chunk(columns, 3)
    const rows = chunkOfColumns.map((chunkOfColumn, index) => (
      <div className="columns" key={index}>
        {chunkOfColumn}
      </div>
    ))

    return <main className={styles.posts}>{rows}</main>
  }
}

Posts.propTypes = {
  data: PropTypes.object.isRequired,
}

export default Posts
