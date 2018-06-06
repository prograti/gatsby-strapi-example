import React from 'react'
import Link from 'gatsby-link'
import Helmet from 'react-helmet'

import NavigationHome from '../components/Navigation/Home'
import Posts from '../components/Posts'

const config = require('../web-config')

const TagPage = ({ data }) => (
  <div>
    <Helmet>
      <title>{`${data.tag.name} | ${data.site.siteMetadata.title}`}</title>
      <meta
        name="description"
        content={`${data.tag.name}に関する投稿の一覧ページです。`}
      />
      <script type="text/javascript">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.gaTrackingID}', {
          'page_path': '/tag/${data.tag.slug}/'
        });
      `}</script>
    </Helmet>
    <NavigationHome />
    <Posts data={data} />
  </div>
)

export default TagPage

export const query = graphql`
  query TaggedPostsQuery($slug: String!) {
    site: site {
      siteMetadata {
        title
      }
    }
    tag: strapiTag(slug: { eq: $slug }) {
      name
      slug
      posts {
        id
      }
    }
    posts: allStrapiPost(sort: { fields: [fields___postedAt], order: DESC }) {
      edges {
        node {
          id
          title
          description
          slug
          tags {
            id
            name
            slug
          }
          fields {
            postedAt(formatString: "DD MMMM YYYY")
          }
        }
      }
    }
    thumbnails: allImageSharp(filter: { fields: { slug: { ne: null } } }) {
      edges {
        node {
          resolutions(width: 100, height: 100) {
            src
          }
          fields {
            slug
          }
        }
      }
    }
  }
`
