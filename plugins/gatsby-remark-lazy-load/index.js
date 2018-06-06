const visit = require('unist-util-visit');

module.exports = ({markdownAST}) => {
  visit(markdownAST, 'image', node => {
    node.type = 'html';
    node.value = `<img class="lazyload" src="/placeholder.png" data-src="${node.url}" alt="${node.alt}" />`;
  });
};