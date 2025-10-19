const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_super_secret_jwt_key'; // Must be the same as in auth.js

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send({ message: "No token provided!" });
    }
    
    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized! Invalid Token." });
        }
        req.userId = decoded.id;
        next();
    });
};

module.exports = { verifyToken };