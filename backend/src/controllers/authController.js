//Register script

const pool = require("../config/db");
const bcrypt = require("bcrypt");

exports.register = async(req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users(name, email, password_hash, role)
            VALUES($1, $2, $3, $4)
            RETURNING id, name, email, role`,
            [name, email, hashedPassword, role]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}