import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  entry: 'src/index.js',
  plugins: [
    nodeResolve(),
    commonjs()
  ],
  format: 'cjs',
  dest: 'muv.js'
};
