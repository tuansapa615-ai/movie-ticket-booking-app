// models/User.js
import { pool } from '../config/db.js';

class User {
 
    static async findByEmail(email) {
        // THÊM password_hash VÀO DANH SÁCH CỘT SELECT
        const [rows] = await pool.execute(
            'SELECT user_id, username, email, password_hash, full_name, phone_number, avatar_url, role, is_verified, created_at, gender, date_of_birth, identity_card_number, city, district, address_line FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async findById(userId, connection = pool) {
        try {
            // THÊM password_hash VÀO DANH SÁCH CỘT SELECT
            const [rows] = await connection.execute(
                'SELECT user_id, username, email, password_hash, full_name, phone_number, avatar_url, role, is_verified, created_at, gender, date_of_birth, identity_card_number, city, district, address_line FROM users WHERE user_id = ?',
                [userId]
            );
            return rows[0];
        } catch (error) {
            console.error("Lỗi khi tìm người dùng theo ID từ DB:", error);
            throw new Error('Không thể tìm người dùng trong cơ sở dữ liệu.');
        }
    }

    // Cập nhật hàm createUser để bao gồm các trường mới
    static async createUser(username, email, passwordHash, fullName = null, phoneNumber = null, avatarUrl = null, role = 'customer', gender = null, dateOfBirth = null, identityCardNumber = null, city = null, district = null, addressLine = null) {
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, full_name, phone_number, avatar_url, role, gender, date_of_birth, identity_card_number, city, district, address_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, fullName, phoneNumber, avatarUrl, role, gender, dateOfBirth, identityCardNumber, city, district, addressLine]
        );
        return result.insertId;
    }
    // static async updateUser(userId, userData) {
    //     const fields = [];
    //     const values = [];

    //     // Kiểm tra từng trường và thêm vào query nếu nó được cung cấp và không phải undefined/null
    //     if (userData.full_name !== undefined) { fields.push('full_name = ?'); values.push(userData.full_name); }
    //     if (userData.phone_number !== undefined) { fields.push('phone_number = ?'); values.push(userData.phone_number); }
    //     if (userData.gender !== undefined) { fields.push('gender = ?'); values.push(userData.gender); }
    //     // date_of_birth có thể là Date object hoặc chuỗi ISO, cần xử lý cẩn thận nếu truyền từ frontend
    //     if (userData.date_of_birth !== undefined) { fields.push('date_of_birth = ?'); values.push(userData.date_of_birth); }
    //     if (userData.identity_card_number !== undefined) { fields.push('identity_card_number = ?'); values.push(userData.identity_card_number); }
    //     if (userData.city !== undefined) { fields.push('city = ?'); values.push(userData.city); }
    //     if (userData.district !== undefined) { fields.push('district = ?'); values.push(userData.district); }
    //     if (userData.address_line !== undefined) { fields.push('address_line = ?'); values.push(userData.address_line); }

    //     if (fields.length === 0) {
    //         return { affectedRows: 0, message: 'Không có trường nào để cập nhật.' }; // Không có gì để update
    //     }

    //     values.push(userId); // userId cho điều kiện WHERE
    //     const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
    //     const [result] = await pool.execute(query, values);
    //     return result; // Trả về kết quả affectedRows
    // }
    static async updatePassword(userId, passwordHash) {
        await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
    }

    static async updateEmailVerificationStatus(userId, isVerified = 1) {
        await pool.execute('UPDATE users SET is_verified = ? WHERE user_id = ?', [isVerified, userId]);
    }

    static async updateAvatarUrl(userId, avatarUrl) {
        await pool.execute('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);
    }

    // HÀM MỚI: Cập nhật thông tin người dùng (cho Profile)
    static async updateUser(userId, userData) {
        const fields = [];
        const values = [];

        // Thêm các trường mới vào đây
        if (userData.full_name !== undefined) {
            fields.push('full_name = ?');
            values.push(userData.full_name);
        }
        if (userData.phone_number !== undefined) {
            fields.push('phone_number = ?');
            values.push(userData.phone_number);
        }
        if (userData.gender !== undefined) {
            fields.push('gender = ?');
            values.push(userData.gender);
        }
        if (userData.date_of_birth !== undefined) {
            fields.push('date_of_birth = ?');
            values.push(userData.date_of_birth);
        }
        if (userData.identity_card_number !== undefined) {
            fields.push('identity_card_number = ?');
            values.push(userData.identity_card_number);
        }
        if (userData.city !== undefined) {
            fields.push('city = ?');
            values.push(userData.city);
        }
        if (userData.district !== undefined) {
            fields.push('district = ?');
            values.push(userData.district);
        }
        if (userData.address_line !== undefined) {
            fields.push('address_line = ?');
            values.push(userData.address_line);
        }
        // Có thể thêm username, email nếu bạn cho phép đổi (cần cẩn thận với trùng lặp)

        if (fields.length === 0) {
            return { affectedRows: 0, message: 'Không có trường nào để cập nhật.' };
        }

        values.push(userId); // Thêm userId vào cuối mảng giá trị

        const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
        const [result] = await pool.execute(query, values);
        return result;
    }

    static async findAllUsers(searchTerm = null) { // Tham số searchTerm được giữ nguyên
        let connection;
        try {
            connection = await pool.getConnection();
            let query = `
                SELECT
                    user_id, username, email, full_name, phone_number, avatar_url,
                    role, is_verified, created_at, gender, date_of_birth,
                    identity_card_number, city, district, address_line
                FROM users
            `;
            const params = [];
            const conditions = []; // Mảng để lưu các điều kiện WHERE

            // Thêm điều kiện lọc theo vai trò 'customer'
            conditions.push(` role = 'customer'`); // <-- THÊM DÒNG NÀY

            if (searchTerm) {
                conditions.push(` (username LIKE ? OR email LIKE ? OR full_name LIKE ?)`);
                const likeTerm = `%${searchTerm}%`;
                params.push(likeTerm, likeTerm, likeTerm);
            }

            if (conditions.length > 0) {
                query += ` WHERE ` + conditions.join(` AND `); // Nối các điều kiện bằng AND
            }

            query += ` ORDER BY user_id DESC`; // Sắp xếp để dễ xem

            const [rows] = await connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error("Lỗi khi lấy tất cả người dùng từ DB:", error);
            throw new Error('Không thể lấy danh sách người dùng từ cơ sở dữ liệu.');
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

export default User;