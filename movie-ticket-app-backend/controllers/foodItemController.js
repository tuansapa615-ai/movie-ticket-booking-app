// controllers/foodItemController.js
import FoodItem from '../models/FoodItem.js';
import { v2 as cloudinary } from '../config/cloudinaryConfig.js'; // Đảm bảo import này được thêm vào


// Hàm helper để tạo phản hồi lỗi validation nhất quán
const createValidationError = (path, msg, value = undefined) => ({
    type: "field",
    value: value,
    msg: msg,
    path: path,
    location: "body"
});

// Lấy tất cả đồ ăn
export const getAllFoodItems = async (req, res) => {
    try {
        const foodItems = await FoodItem.findAll();
        res.json({ success: true, foodItems: foodItems });
    } catch (error) {
        console.error('Error fetching food items:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách đồ ăn.', error: error.message });
    }
};

// Lấy đồ ăn theo ID
export const getFoodItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const foodItem = await FoodItem.findById(id);
        if (!foodItem) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đồ ăn.' });
        }
        res.json({ success: true, foodItem: foodItem });
    } catch (error) {
        console.error(`Error fetching food item with ID ${id}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin đồ ăn.', error: error.message });
    }
};

// Thêm đồ ăn mới
export const addFoodItem = async (req, res) => {
    const { category_name, name, description, price, is_available } = req.body;
    const image_url = req.file ? req.file.path : null;

    const errors = [];

    // --- Validation thủ công cho addFoodItem ---
    if (!category_name || typeof category_name !== 'string' || category_name.trim() === '') {
        errors.push(createValidationError('category_name', 'Tên danh mục không được trống.', category_name));
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push(createValidationError('name', 'Tên đồ ăn không được trống.', name));
    } else if (name.length > 100) {
        errors.push(createValidationError('name', 'Tên đồ ăn không quá 100 ký tự.', name));
    }
    // `description` là optional, chỉ validate nếu nó tồn tại và không phải là chuỗi
    if (description !== undefined && description !== null && typeof description !== 'string') {
        errors.push(createValidationError('description', 'Mô tả phải là chuỗi.', description));
    }

    // Validation cho price
    let finalPrice = price; // Giá trị đã được parse để sử dụng
    if (price === undefined || price === null || String(price).trim() === '') { // Kiểm tra cả chuỗi rỗng
        errors.push(createValidationError('price', 'Giá không được trống.', price));
    } else {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
            errors.push(createValidationError('price', 'Giá phải là một số.', price));
        } else if (parsedPrice <= 0) {
            errors.push(createValidationError('price', 'Giá phải là số dương.', price));
        }
        finalPrice = parsedPrice; // Gán giá trị đã parse cho finalPrice
    }

    // Validation cho is_available
    let finalIsAvailable = is_available; // Giá trị đã được parse để sử dụng
    if (is_available === undefined || is_available === null || (String(is_available).toLowerCase() !== 'true' && String(is_available).toLowerCase() !== 'false')) {
        errors.push(createValidationError('is_available', 'Trạng thái khả dụng phải là boolean (true/false).', is_available));
    } else {
        finalIsAvailable = String(is_available).toLowerCase() === 'true'; // Chuyển đổi chuỗi 'true'/'false' thành boolean
    }
    // --- Kết thúc Validation thủ công ---

    if (errors.length > 0) {
        // Nếu có lỗi validation, và ảnh đã upload, cần xóa ảnh đã upload để tránh rác
        if (req.file) {
            const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.warn('Cloudinary: Uploaded image cleaned up due to validation error.');
            }
        }
        return res.status(400).json({ success: false, errors: errors });
    }

    try {
        const newFoodItem = await FoodItem.create({
            category_name,
            name,
            description,
            price: finalPrice, // Sử dụng giá trị đã được parse
            image_url,
            is_available: finalIsAvailable // Sử dụng giá trị đã được parse
        });
        if (newFoodItem) {
            res.status(201).json({ success: true, message: 'Đồ ăn đã được thêm thành công!', foodItem: newFoodItem });
        } else {
            // Nếu có lỗi, và ảnh đã upload, cần xóa ảnh đã upload để tránh rác
            if (req.file) {
                const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                    console.warn('Cloudinary: Uploaded image cleaned up due to database insert failure.');
                }
            }
            res.status(500).json({ success: false, message: 'Không thể thêm đồ ăn mới.' });
        }
    } catch (error) {
        console.error('Error adding food item:', error);
        // Nếu có lỗi, và ảnh đã upload, cần xóa ảnh đã upload để tránh rác
        if (req.file) {
            const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.warn('Cloudinary: Uploaded image cleaned up due to error.');
            }
        }
        res.status(500).json({ success: false, message: error.message || 'Đã xảy ra lỗi khi thêm đồ ăn.' });
    }
};

// Cập nhật đồ ăn
export const updateFoodItem = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    const errors = [];

    // --- Validation thủ công cho updateFoodItem ---
    if (updateData.category_name !== undefined) { // Chỉ validate nếu trường này được gửi
        if (typeof updateData.category_name !== 'string' || updateData.category_name.trim() === '') {
            errors.push(createValidationError('category_name', 'Tên danh mục không được trống.', updateData.category_name));
        }
    }
    if (updateData.name !== undefined) { // Chỉ validate nếu trường này được gửi
        if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
            errors.push(createValidationError('name', 'Tên đồ ăn không được trống.', updateData.name));
        } else if (updateData.name.length > 100) {
            errors.push(createValidationError('name', 'Tên đồ ăn không quá 100 ký tự.', updateData.name));
        }
    }
    // `description` là optional, chỉ validate nếu nó tồn tại và không phải là chuỗi
    if (updateData.description !== undefined && updateData.description !== null && typeof updateData.description !== 'string') {
        errors.push(createValidationError('description', 'Mô tả phải là chuỗi.', updateData.description));
    }

    if (updateData.price !== undefined) { // Chỉ validate nếu trường này được gửi
        if (updateData.price === null || String(updateData.price).trim() === '') {
            errors.push(createValidationError('price', 'Giá không được trống.', updateData.price));
        } else {
            const parsedPrice = parseFloat(updateData.price);
            if (isNaN(parsedPrice)) {
                errors.push(createValidationError('price', 'Giá phải là một số.', updateData.price));
            } else if (parsedPrice <= 0) {
                errors.push(createValidationError('price', 'Giá phải là số dương.', updateData.price));
            }
            updateData.price = parsedPrice; // Ép kiểu thành số nếu hợp lệ
        }
    }

    if (updateData.is_available !== undefined) { // Chỉ validate nếu trường này được gửi
        if (updateData.is_available === null || (String(updateData.is_available).toLowerCase() !== 'true' && String(updateData.is_available).toLowerCase() !== 'false')) {
            errors.push(createValidationError('is_available', 'Trạng thái khả dụng phải là boolean (true/false).', updateData.is_available));
        }
        updateData.is_available = String(updateData.is_available).toLowerCase() === 'true'; // Ép kiểu thành boolean nếu hợp lệ
    }
    // --- Kết thúc Validation thủ công ---

    if (errors.length > 0) {
        // Nếu có lỗi validation, và ảnh đã upload, cần xóa ảnh đã upload để tránh rác
        if (req.file) {
            const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.warn('Cloudinary: Uploaded image cleaned up due to validation error.');
            }
        }
        return res.status(400).json({ success: false, errors: errors });
    }

    // Nếu có file ảnh mới được upload, cập nhật image_url
    if (req.file) {
        updateData.image_url = req.file.path;
    }

    try {
        const success = await FoodItem.update(id, updateData); // Model sẽ tự xử lý xóa ảnh cũ
        if (success) {
            res.json({ success: true, message: 'Đồ ăn đã được cập nhật thành công!' });
        } else {
            // Nếu không có item nào được cập nhật, và có ảnh mới được upload, cần xóa ảnh mới để tránh rác
            if (req.file) {
                const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                    console.warn('Cloudinary: Newly uploaded image cleaned up as no item was updated.');
                }
            }
            const existingItem = await FoodItem.findById(id);
            if (!existingItem) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đồ ăn để cập nhật.' });
            }
            res.status(200).json({ success: false, message: 'Không có thay đổi nào được áp dụng cho đồ ăn.' });
        }
    } catch (error) {
        console.error(`Error updating food item with ID ${id}:`, error);
        // Nếu có lỗi, và ảnh mới đã upload, cần xóa ảnh mới để tránh rác
        if (req.file) {
            const publicId = FoodItem.getPublicIdFromUrl(req.file.path);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.warn('Cloudinary: Newly uploaded image cleaned up due to error during update.');
            }
        }
        res.status(500).json({ success: false, message: error.message || 'Đã xảy ra lỗi khi cập nhật đồ ăn.' });
    }
};

// Xóa đồ ăn
export const deleteFoodItem = async (req, res) => {
    const { id } = req.params;
    try {
        const success = await FoodItem.delete(id);
        if (success) {
            res.json({ success: true, message: 'Đồ ăn đã được xóa thành công!' });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy đồ ăn để xóa.' });
        }
    } catch (error) {
        console.error(`Error deleting food item with ID ${id}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Đã xảy ra lỗi khi xóa đồ ăn.' });
    }
};
