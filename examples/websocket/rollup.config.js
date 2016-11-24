import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'

export default {
  entry: 'index.js',
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  format: 'es',
  dest: 'websocket.js',
  sourceMap: 'inline'
};
