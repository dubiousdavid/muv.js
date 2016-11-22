import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  entry: 'index.js',
  plugins: [
    nodeResolve(),
    commonjs()
  ],
  format: 'es',
  dest: 'websocket.js',
  sourceMap: 'inline'
};
