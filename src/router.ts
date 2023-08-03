import { IRequest, Router, createCors, json, withContent } from 'itty-router';
import { v4 as uuidv4 } from 'uuid';
// create the CORS pair
export const { preflight, corsify } = createCors({
	methods: ['*'],
	origins: ['*'],
	headers: {
		'*': '*',
	},
});

const errors = {
	'404': () => new Response('Not Found.', { status: 404 }),
	'401': () => new Response('No Auth.', { status: 401 }),
	'400': () => new Response('Bad Request.', { status: 400 }),
	'403': () => new Response('Refuse Request.', { status: 403 }),
};

const router = Router();

interface essay {
	code: string;
	content: string;
	updatedAt: string;
	view: number;
}

interface essayCreate {
	code?: string;
	content: string;
	url?: string;
	updatedAt: string;
}

export interface essayUpdate {
	content: string;
	code?: string;
	newUrl?: string;
	newCode?: string;
}

router.all('*', preflight);

router.get('/api/c/:url', async (request, kv) => {
	const url = request.params['url'];
	const essayStr = await (<KVNamespace>kv).get(url);
	if (!essayStr) {
		return errors[404]();
	}
	const fetchedEssay = JSON.parse(essayStr) as essay;

	fetchedEssay.view = fetchedEssay.view + 1;
	await (<KVNamespace>kv).put(url, JSON.stringify(fetchedEssay));
	return json(fetchedEssay);
});

router.post('/api/c', async (request, kv) => {
	const kvDB = <KVNamespace>kv;
	let returnUrl = '';
	try {
		const requestEssay = await request.json<essayCreate>();
		if (requestEssay.content === '') {
			return errors[400]();
		}
		if (requestEssay.url) {
			const essayStr = await kvDB.get(requestEssay.url);
			if (essayStr) {
				return errors[403]();
			}
		}
		requestEssay.updatedAt = new Date().toISOString();
		if (!requestEssay.url) {
			requestEssay.url = crypto.randomUUID();
		}

		// new update
		requestEssay.updatedAt = new Date().toISOString();
		await kvDB.put(requestEssay.url, JSON.stringify(requestEssay));
		returnUrl = requestEssay.url;
	} catch (err) {
		console.log(err);
		return errors[400]();
	}

	return new Response(returnUrl);
});

router.post('/api/c/:url', async (request, kv) => {
	const kvDB = <KVNamespace>kv;
	const oldUrl = request.params['url'];
	let newUrl = oldUrl;
	try {
		const requestEssay = await request.json<essayUpdate>();
		if (requestEssay.content === '') {
			return errors[400]();
		}
		const essayStr = await kvDB.get(oldUrl);
		if (!essayStr) {
			return errors[404]();
		}
		const fetchedEssay = JSON.parse(essayStr) as essay;
		if (!fetchedEssay.code || fetchedEssay.code != requestEssay.code) {
			return errors[401]();
		}
		fetchedEssay.updatedAt = new Date().toISOString();
		fetchedEssay.content = requestEssay.content;
		if (requestEssay.newCode) {
			fetchedEssay.code = requestEssay.newCode;
		}
		if (requestEssay.newUrl && oldUrl != requestEssay.newUrl) {
			if (await kvDB.get(newUrl)) {
				return errors[401]();
			}
			await kvDB.delete(oldUrl);
			newUrl = requestEssay.newUrl;
		}
		await kvDB.put(newUrl, JSON.stringify(fetchedEssay));
	} catch (err) {
		console.log(err);
		return errors[400]();
	}

	return new Response(newUrl);
});

router.all('*', () => errors[404]());

export default router;
