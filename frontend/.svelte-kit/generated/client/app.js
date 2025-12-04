export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27')
];

export const server_loads = [2];

export const dictionary = {
		"/": [4],
		"/admin": [5,[2]],
		"/admin/albums": [6,[2]],
		"/admin/albums/[id]": [7,[2]],
		"/admin/albums/[id]/edit": [8,[2]],
		"/admin/analytics": [9,[2]],
		"/admin/backup-restore": [10,[2]],
		"/admin/blog-categories": [11,[2]],
		"/admin/deployment": [12,[2]],
		"/admin/groups": [13,[2]],
		"/admin/locations": [14,[2]],
		"/admin/pages": [15,[2]],
		"/admin/people": [16,[2]],
		"/admin/photos/[id]/edit": [17,[2]],
		"/admin/site-config": [18,[2]],
		"/admin/storage": [19,[2]],
		"/admin/tags": [20,[2]],
		"/admin/templates": [21,[2]],
		"/admin/templates/overrides": [22,[2]],
		"/admin/users": [23,[2]],
		"/albums": [24],
		"/albums/new": [25],
		"/albums/[alias]": [26],
		"/login": [27]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';