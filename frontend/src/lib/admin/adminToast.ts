import { adminToaster } from './toaster';

type ToastPayload = { title: string; description?: string };

export const adminToast = {
	success(payload: ToastPayload) {
		adminToaster.success({
			title: payload.title,
			description: payload.description,
			duration: 4500,
		});
	},
	error(payload: ToastPayload) {
		adminToaster.error({
			title: payload.title,
			description: payload.description,
			duration: 8000,
		});
	},
	info(payload: ToastPayload) {
		adminToaster.info({
			title: payload.title,
			description: payload.description,
			duration: 5000,
		});
	},
};
