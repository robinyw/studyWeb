module.exports = {
  target: 'webworker',
  entry: './workers-site/index.js',
  mode: 'production',
  resolve: {
    extensions: ['.js', '.json'],
  },
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  }
}
