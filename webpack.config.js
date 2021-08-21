const path = require('path');
const { DefinePlugin } = require('webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

/** @type {import('webpack').Configuration} */
const config = {
  entry: {
    index: './src/index.ts',
    "index.jspatpkg": './src/index.jspatpkg.ts'
  },
  resolve: {
    fallback: {
      "util": require.resolve("util")
    },
    extensions: ['.tsx', '.ts', '.js']
  },
  node: {
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: "",
    libraryTarget: 'commonjs',
    chunkFilename: 'js/[chunkhash].js'
  },
  module: {
    rules: [{
        test: /\.(ts|js)x?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ]
  },
  plugins: [
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
      },
      'process.platform': {}
    }),
    new CleanWebpackPlugin()
  ],
  // watch: true,
  watchOptions: {
    ignored: /node_modules/
  }
};
module.exports = (env, argv) => {
  if (argv.mode === 'development') {
    config.devtool = 'source-map';
    config.output.filename = '[name].js';
  }
  if (argv.mode === 'production') {
    config.devtool = 'source-map';
    config.output.filename = '[name].min.js';
  }
  return config;
};