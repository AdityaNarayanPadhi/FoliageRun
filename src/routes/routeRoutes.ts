import { Router } from 'express';
import { RouteController } from '../controllers/routeController';

const router = Router();

router.post('/generate', RouteController.generateRoute);
router.get('/download-gpx', RouteController.downloadGpx);

export default router;
