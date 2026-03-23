/**
 * TensorFlow.js Node backend still calls Node's deprecated util.isNullOrUndefined /
 * util.isArray in some paths. Those helpers were removed in Node.js 23+, which breaks
 * MobileNet load with: "(0 , util_1.isNullOrUndefined) is not a function".
 *
 * Import this module once before any `import('@tensorflow/tfjs-node')`.
 * @see https://github.com/tensorflow/tfjs/pull/8425
 */
import * as nodeUtil from 'node:util';

type UtilWithLegacy = typeof nodeUtil & {
	isNullOrUndefined?: (v: unknown) => boolean;
	isArray?: (a: unknown) => boolean;
};

const u = nodeUtil as UtilWithLegacy;

if (typeof u.isNullOrUndefined !== 'function') {
	(u as Record<string, unknown>).isNullOrUndefined = (v: unknown) => v == null;
}
if (typeof u.isArray !== 'function') {
	(u as Record<string, unknown>).isArray = Array.isArray;
}
