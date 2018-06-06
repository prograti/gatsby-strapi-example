import React from 'react'
import Link from 'gatsby-link'
import Helmet from 'react-helmet'

import '../styles/highligh.css'
import NavigationHome from '../components/Navigation/Home'
import Post from '../components/Post'

const config = require('../web-config')

const PostPage = ({ data }) => (
  <div>
    <Helmet>
      <title>{`${data.post.title} | ${data.site.siteMetadata.title}`}</title>
      <meta name="description" content={data.post.description} />
      <script type="text/javascript">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.gaTrackingID}', {
          'page_path': '/blog/${data.post.slug}/'
        });
      `}</script>
    </Helmet>
    <NavigationHome />
    <Post data={data} />
  </div>
)

export default PostPage

export const query = graphql`
  query PostQuery($slug: String!, $page: Int!) {
    site: site {
      siteMetadata {
        title
      }
    }
    post: strapiPost(slug: { eq: $slug }) {
      title
      description
      slug
      tags {
        name
        slug
      }
      fields {
        postedAt(formatString: "DD MMMM YYYY")
        pageCount
      }
    }
    markdown: markdownRemark(
      fields: { slug: { eq: $slug }, pageNo: { eq: $page } }
    ) {
      html
      fields {
        pageNo
      }
    }
  }
`
