import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { assetIdParamsSchema, createAssetSchema, updateAssetSchema } from '../validators/assetValidators.js';
import * as assetService from '../services/assetService.js';

const router = Router();

router.use(authenticate);

// GET /api/assets -> 200 { data: [...] }
router.get('/', async (req, res) => {
  const assets = await assetService.listAssets(req.user.id);
  res.json({ data: assets });
});

// POST /api/assets -> 201 { data: {...} }
router.post('/', validate({ body: createAssetSchema }), async (req, res) => {
  const asset = await assetService.createAsset(req.user.id, req.valid.body);
  res.status(201).json({ data: asset });
});

// GET /api/assets/:id -> 200 { data: {...} }
router.get('/:id', validate({ params: assetIdParamsSchema }), async (req, res) => {
  const asset = await assetService.getAsset(req.user.id, req.valid.params.id);
  res.json({ data: asset });
});

// PATCH /api/assets/:id (partial update, at least one field) -> 200 { data: {...} }
router.patch('/:id', validate({ params: assetIdParamsSchema, body: updateAssetSchema }), async (req, res) => {
  const asset = await assetService.updateAsset(req.user.id, req.valid.params.id, req.valid.body);
  res.json({ data: asset });
});

// DELETE /api/assets/:id -> 204
router.delete('/:id', validate({ params: assetIdParamsSchema }), async (req, res) => {
  await assetService.deleteAsset(req.user.id, req.valid.params.id);
  res.status(204).end();
});

export default router;
