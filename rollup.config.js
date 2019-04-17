import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import pkg from './package.json';

// browser-friendly UMD build

export default [

	{
		input: 'src/main.js',
		output: {
			name: 'ComponentLibrary',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
			builtins(),
			resolve({
				customResolveOptions: {
					moduleDirectory: 'node_modules'
				}
			}),
			commonjs() // so Rollup can convert `ms` to an ES module
		]
	},

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify 
	// `file` and `format` for each target)
	{
		input: 'src/main.js',
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		]
	}
];
