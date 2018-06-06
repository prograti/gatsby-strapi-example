import React from 'react'
import Link from 'gatsby-link'
import Helmet from 'react-helmet'

import Posts from '../components/Posts'

const config = require('../web-config')

const IndexPage = ({ data }) => (
  <div>
    <Helmet>
      <title>{data.site.siteMetadata.title}</title>
      <meta name="description" content={data.site.siteMetadata.description} />
      <script type="text/javascript">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.gaTrackingID}', {
          'page_path': '/'
        });
      `}</script>
    </Helmet>
    <Posts data={data} />
  </div>
)

export default IndexPage

export const query = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
        description
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
