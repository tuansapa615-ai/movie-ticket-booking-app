// routes/movieRoutes.js
import express from 'express';
import * as movieController from '../controllers/movieController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadMoviePoster } from '../config/cloudinaryConfig.js';

const router = express.Router();

// --- Movie Management Routes ---

router.post(
    '/add',
    protect,
    authorize(['admin']),
    uploadMoviePoster.single('posterImage'), 
    movieController.addMovie
);

router.get('/', movieController.getAllMovies);

router.get('/:id', movieController.getMovieById);

router.put(
    '/:id',
    protect,
    authorize(['admin']),
    uploadMoviePoster.single('posterImage'), 
    movieController.updateMovie
);


router.delete('/:id', protect, authorize(['admin']), movieController.deleteMovie);


export default router;
