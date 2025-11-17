// config/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDbConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database successfully!');
        connection.release();
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    }
}

export {
    pool,
    testDbConnection
};