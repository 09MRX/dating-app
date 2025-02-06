const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const AccountActivity = require('../models/AccountActivity');
const PrivacySettings = require('../models/PrivacySettings');
const SocialLink = require('../models/SocialLink');
const Session = require('../models/Session');
const emailNotification = require('./emailNotification');

class DataExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../exports');
        // Ensure export directory exists
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    async exportUserData(userId) {
        try {
            // Create export directory for user if it doesn't exist
            const userExportDir = path.join(this.exportDir, userId.toString());
            if (!fs.existsSync(userExportDir)) {
                fs.mkdirSync(userExportDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportPath = path.join(userExportDir, `data-export-${timestamp}.zip`);
            const output = fs.createWriteStream(exportPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            archive.pipe(output);

            // Fetch user data
            const user = await User.findById(userId).lean();
            delete user.password; // Remove sensitive information

            // Fetch related data
            const [activities, privacySettings, socialLinks, sessions] = await Promise.all([
                AccountActivity.find({ user: userId }).lean(),
                PrivacySettings.findOne({ user: userId }).lean(),
                SocialLink.find({ user: userId }).lean(),
                Session.find({ user: userId }).lean()
            ]);

            // Add data files to archive
            archive.append(JSON.stringify(user, null, 2), { name: 'profile.json' });
            archive.append(JSON.stringify(activities, null, 2), { name: 'account-activity.json' });
            archive.append(JSON.stringify(privacySettings, null, 2), { name: 'privacy-settings.json' });
            archive.append(JSON.stringify(socialLinks, null, 2), { name: 'social-links.json' });
            archive.append(JSON.stringify(sessions, null, 2), { name: 'sessions.json' });

            // Add README
            const readme = this.generateReadme(user.username);
            archive.append(readme, { name: 'README.txt' });

            // Generate summary
            const summary = this.generateSummary({
                user,
                activities,
                privacySettings,
                socialLinks,
                sessions
            });
            archive.append(summary, { name: 'summary.txt' });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.finalize();
            });

            // Generate download URL (this would typically be a signed URL in production)
            const downloadUrl = `/api/exports/${userId}/${path.basename(exportPath)}`;

            // Notify user
            await emailNotification.sendDataExportNotification(user, downloadUrl);

            return {
                downloadUrl,
                expiresIn: '24 hours'
            };
        } catch (error) {
            console.error('Data export failed:', error);
            throw new Error('Failed to export user data');
        }
    }

    generateReadme(username) {
        return `Fish in the Pool - Data Export
Generated for: ${username}
Date: ${new Date().toISOString()}

This archive contains your personal data exported from Fish in the Pool.
Here's what each file contains:

1. profile.json - Your basic profile information
2. account-activity.json - A log of your account activities
3. privacy-settings.json - Your privacy and notification preferences
4. social-links.json - Your connected social media accounts
5. sessions.json - Your active and recent sessions
6. summary.txt - A human-readable summary of your data

For questions or concerns about your data, please contact support@fishinthepool.com`;
    }

    generateSummary(data) {
        const { user, activities, socialLinks, sessions } = data;
        
        return `Fish in the Pool - Data Summary
Generated: ${new Date().toISOString()}

Profile Overview:
- Username: ${user.username}
- Email: ${user.email}
- Account Created: ${new Date(user.createdAt).toLocaleString()}
- Email Verified: ${user.isEmailVerified ? 'Yes' : 'No'}
- 2FA Enabled: ${user.isTwoFactorEnabled ? 'Yes' : 'No'}

Account Activity:
- Total Activities: ${activities.length}
- Last Activity: ${activities[0]?.createdAt ? new Date(activities[0].createdAt).toLocaleString() : 'N/A'}

Connected Social Accounts:
${socialLinks.map(link => `- ${link.platform}: ${link.username}`).join('\n')}

Active Sessions:
${sessions.filter(s => !s.isRevoked).map(s => `- ${s.device} (Last active: ${new Date(s.lastActive).toLocaleString()})`).join('\n')}

This summary was generated automatically. For the complete data, please check the JSON files included in this export.`;
    }

    // Clean up old exports (call this periodically)
    async cleanupOldExports() {
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();

        const dirs = await fs.promises.readdir(this.exportDir);
        
        for (const dir of dirs) {
            const dirPath = path.join(this.exportDir, dir);
            const files = await fs.promises.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.promises.stat(filePath);

                if (now - stats.mtime.getTime() > MAX_AGE) {
                    await fs.promises.unlink(filePath);
                }
            }

            // Remove empty directories
            const remainingFiles = await fs.promises.readdir(dirPath);
            if (remainingFiles.length === 0) {
                await fs.promises.rmdir(dirPath);
            }
        }
    }
}

module.exports = new DataExportService();
