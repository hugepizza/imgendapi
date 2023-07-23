import { IRequest, Router, withContent } from 'itty-router';

const errors = {
	'404': () => new Response('Not Found.', { status: 404 }),
	'401': () => new Response('No Auth.', { status: 401 }),
	'400': () => new Response('Bad Request.', { status: 400 }),
};

const router = Router();

interface essay {
	code: string;
	content: string;
	updatedAt: string;
}

router.get('/api/c/:id', async (request, kv) => {
	const id = request.params['id'];
	const essayStr = await (<KVNamespace>kv).get(id);
	if (!essayStr) {
		return errors[404]();
	}
	const fetchedEssay = JSON.parse(essayStr) as essay;
	const code = request.query['code'];
	if (fetchedEssay.code != code) {
		return errors[401]();
	}
	return new Response(fetchedEssay.content);
});

router.post('/api/c/:id', async (request, kv) => {
	const id = request.params['id']
	try {
		const body = await request.json<essay>();
		await (<KVNamespace>kv).put(id, JSON.stringify(body));
	} catch (err) {
		console.log(err);
		return errors[400]();
	}

	return new Response(id);
});

router.all('*', () => errors[404]());

export default router;
