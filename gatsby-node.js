const path = require('path');
const slash = require('slash');
const { store } = require('./node_modules/gatsby/dist/redux');

const webconfig = require("./src/web-config");

const BLOG_POST_FILENAME_REGEX = /([0-9]+)\-([0-9]+)\-([0-9]+)\-(.+)\/page\-([0-9]+)\.md$/;
const BLOG_THUMBNAIL_REGEX = /.+\/content\/posts\/[0-9]+\-[0-9]+\-[0-9]+\-(.+)\/thumbnail\.png.+/;

exports.modifyWebpackConfig = ({ config, stage }) => {
  switch (stage) {
    case 'develop': {
      config.merge({
        output: {
          publicPath: webconfig.publicPath
        }
      });
      return config;
    }
  }
};

exports.onCreateNode = ({ node, getNode, boundActionCreators }) => {
  const { createNodeField } = boundActionCreators;
  let slug, match;

  switch (node.internal.type) {
    case 'MarkdownRemark':
      const { relativePath } = getNode(node.parent);
      match = BLOG_POST_FILENAME_REGEX.exec(relativePath);
      const year = match[1];
      const month = match[2];
      const day = match[3];
      const filename = match[4];
      const pageNo = match[5];
      
      slug = filename;
      createNodeField({
        node,
        name: 'slug',
        value: slug,
      });
      
      const date = new Date(year, month - 1, day);
      createNodeField({
        node,
        name: 'postedAt',
        value: date.toJSON(),
      });
      
      createNodeField({
        node,
        name: 'pageNo',
        value: parseInt(pageNo, 10),
      });
      
      break;
    case 'ImageSharp':
      match = BLOG_THUMBNAIL_REGEX.exec(node.id);
      if (match !== null) {
        slug = match[1];
        createNodeField({
          node,
          name: 'slug',
          value: slug,
        });
      }
      
      break;
    case 'StrapiPost':
      slug = node.slug;
      const nodes = Object.values(store.getState().nodes).filter(node => node.internal.type === 'MarkdownRemark' && node.fields.slug == slug);
      if (nodes.length > 0) {
        createNodeField({
          node,
          name: 'postedAt',
          value: nodes[0].fields.postedAt,
        });
        
        createNodeField({
          node,
          name: 'pageCount',
          value: nodes.length,
        });
      }

      break;
  }
};

exports.createPages = async ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators;
  const postTemplate = path.resolve(`src/templates/post.js`);
  const tagTemplate = path.resolve(`src/templates/tag.js`);
  
  const posts = await graphql(
    `
      {
        allStrapiPost {
          edges {
            node {
              slug
              fields {
                pageCount
              }
            }
          }
        }
      }
    `
  );
  
  if (posts.errors) {
    console.error(posts.errors);
    throw Error(posts.errors);
  }
  
  posts.data.allStrapiPost.edges.map(({ node }) => {
    const pageCount = node.fields.pageCount;
    for (i = 1; i <= pageCount; i++) {
      createPage({
        path: i == 1 ? `/blog/${node.slug}/` : `/blog/${node.slug}/${i}/`,
        component: slash(postTemplate),
        context: {
          slug: node.slug,
          page: i
        }
      });
    }
  });
  
  const tags = await graphql(
    `
      {
        allStrapiTag {
          edges {
            node {
              slug
            }
          }
        }
      }
    `
  );
  
  if (tags.errors) {
    console.error(tags.errors);
    throw Error(tags.errors);
  }
  
  tags.data.allStrapiTag.edges.map(({ node }) => {
    createPage({
      path: `/tag/${node.slug}/`,
      component: slash(tagTemplate),
      context: {
        slug: node.slug
      }
    });
  });
};