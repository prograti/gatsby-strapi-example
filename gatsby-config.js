const config = require("./src/web-config");

module.exports = {
  siteMetadata: {
    title: config.siteTitle,
    description: config.siteDescription,
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-sass',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: `${__dirname}/content/posts/`,
        name: 'posts'
      }
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-copy-linked-files',
            options: {
              destinationDir: 'static',
              ignoreFileExtensions: [],
            }
          },
          'gatsby-remark-prismjs',
          'gatsby-remark-emoji',
          'gatsby-remark-lazy-load'
        ]
      }
    },
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-strapi',
      options: {
        apiURL: config.apiUrl,
        contentTypes: [
          'post',
          'tag',
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: config.manifestName,
        short_name: config.manifestShortName,
        start_url: config.manifestStartUrl,
        background_color: config.manifestBackgroundColor,
        theme_color: config.manifestThemeColor,
        display: config.manifestDisplay,
        icons: [
          {
            src: "/icon/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          }
        ]
      }
    },
    'gatsby-plugin-offline',
    {
      resolve: 'gatsby-plugin-nprogress',
      options: {
        color: '#61dafb',
      },
    },
  ],
}
