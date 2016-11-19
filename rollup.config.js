import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  entry: 'src/main.js',
  plugins: [
    nodeResolve(),
    commonjs()
  ],
  format: 'es',
  dest: 'bundle.js',
  sourceMap: 'inline'
};
