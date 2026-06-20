import Router from 'express-promise-router';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../services/database';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';

export function wishlistRoutes() {
  const router = Router();

  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const items = await db(TABLES.WISHLIST_ITEMS)
      .join(TABLES.PRODUCTS, `${TABLES.WISHLIST_ITEMS}.product_id`, `${TABLES.PRODUCTS}.id`)
      .select(`${TABLES.WISHLIST_ITEMS}.*`, `${TABLES.PRODUCTS}.name`, `${TABLES.PRODUCTS}.price`, `${TABLES.PRODUCTS}.stock`)
      .where({ [`${TABLES.WISHLIST_ITEMS}.user_id`]: user.id });
    res.json({ items });
  });

  router.post('/', async (req: any, res) => {
    const { db, user } = req;
    const { productId } = req.body;

    const product = await db(TABLES.PRODUCTS).where({ id: productId, is_active: true }).first();
    if (!product) throw new NotFoundError('Product not found.');

    const existing = await db(TABLES.WISHLIST_ITEMS).where({ user_id: user.id, product_id: productId }).first();
    if (existing) throw new ConflictError('Product already in wishlist.');

    await db(TABLES.WISHLIST_ITEMS).insert({
      id: uuidv4(), user_id: user.id, product_id: productId, created_at: new Date(),
    });
    res.status(201).json({ message: 'Added to wishlist.' });
  });

  router.delete('/:productId', async (req: any, res) => {
    const { db, user } = req;
    await db(TABLES.WISHLIST_ITEMS).where({ user_id: user.id, product_id: req.params.productId }).delete();
    res.json({ message: 'Removed from wishlist.' });
  });

  return router;
}
