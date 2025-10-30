/**
 * Custom webpack loader that strips trailing sourceMappingURL comments.
 * Next's build will otherwise fetch the lucide-react source maps which
 * embed large base64 previews and trigger PackFileCache warnings.
 */
module.exports = function stripSourceMapComment(source) {
  return source.replace(/\/\/# sourceMappingURL=.*$/gm, "");
};
