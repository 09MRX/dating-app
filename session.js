const Session = require('../models/Session');
const AccountActivity = require('../models/AccountActivity');
const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');

const createSession = async (user, req) => {
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    const ua = new UAParser(req.headers['user-agent']);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = `${os.name} ${os.version} - ${browser.name} ${browser.version}`;

    const session = new Session({
        user: user._id,
        token,
        device,
        ip: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await session.save();

    // Log activity
    await new AccountActivity({
        user: user._id,
        action: 'login',
        ip: req.ip,
        device,
        browser: `${browser.name} ${browser.version}`,
        status: 'success'
    }).save();

    return token;
};

const validateSession = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session exists and is not revoked
        const session = await Session.findOne({
            token,
            user: decoded.id,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ message: 'Invalid or expired session' });
        }

        // Update last active timestamp
        session.lastActive = new Date();
        await session.save();

        req.user = decoded;
        req.session = session;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

const revokeSession = async (sessionId) => {
    const session = await Session.findById(sessionId);
    if (session) {
        session.isRevoked = true;
        await session.save();

        await new AccountActivity({
            user: session.user,
            action: 'logout',
            ip: session.ip,
            device: session.device,
            status: 'success'
        }).save();
    }
};

const revokeAllSessions = async (userId, exceptSessionId = null) => {
    const query = {
        user: userId,
        isRevoked: false
    };

    if (exceptSessionId) {
        query._id = { $ne: exceptSessionId };
    }

    await Session.updateMany(query, {
        $set: { isRevoked: true }
    });
};

module.exports = {
    createSession,
    validateSession,
    revokeSession,
    revokeAllSessions
};
