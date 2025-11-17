// src/routes/foodItemRoutes.js
import express from 'express';
import * as foodItemController from '../controllers/foodItemController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadFoodItemImage } from '../config/cloudinaryConfig.js';


const router = express.Router();


router.get('/', foodItemController.getAllFoodItems);
router.get('/:id', foodItemController.getFoodItemById);

router.post(
    '/',
    protect,
    authorize(['admin']),
    uploadFoodItemImage.single('image'), // Middleware upload ảnh, tên trường là 'image'
    foodItemController.addFoodItem
);
router.put(
    '/:id',
    protect,
    authorize(['admin']),
    uploadFoodItemImage.single('image'), // Middleware upload ảnh, tên trường là 'image'
    foodItemController.updateFoodItem
);
router.delete('/:id', protect, authorize(['admin']), foodItemController.deleteFoodItem);

export default router;