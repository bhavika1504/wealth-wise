const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors")({ origin: true });
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Initialize Gemini with the provided API key
const genAI = new GoogleGenerativeAI("AIzaSyBav5ZNMJY_bfEDp4S_YDX-Fq6PtBjj650");

// Email transporter configuration
// For Gmail, you need to enable "Less secure app access" or use App Password
// Get App Password: Google Account → Security → 2-Step Verification → App passwords
const createEmailTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER || "your-email@gmail.com",
            pass: process.env.GMAIL_APP_PASSWORD || "your-app-password",
        },
    });
};

// Email templates
const emailTemplates = {
    warning: {
        subject: "⚠️ WealthWise Alert: {title}",
        getHtml: (alert, userName) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .alert-title { font-size: 18px; font-weight: bold; color: #92400e; margin-bottom: 10px; }
                    .alert-message { color: #78350f; line-height: 1.6; }
                    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ Financial Alert</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName || "there"},</p>
                        <div class="alert-box">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                        <p>We noticed something that needs your attention. Log in to WealthWise to take action.</p>
                        <a href="https://wealthwise-af0e4.web.app/alerts" class="cta-button">View in App →</a>
                    </div>
                    <div class="footer">
                        <p>You're receiving this because you enabled email alerts in WealthWise.</p>
                        <p>© ${new Date().getFullYear()} WealthWise - Your AI Financial Advisor</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    },
    success: {
        subject: "🎉 WealthWise: {title}",
        getHtml: (alert, userName) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .alert-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .alert-title { font-size: 18px; font-weight: bold; color: #065f46; margin-bottom: 10px; }
                    .alert-message { color: #047857; line-height: 1.6; }
                    .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Great News!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName || "there"},</p>
                        <div class="alert-box">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                        <p>Keep up the great work with your financial journey!</p>
                        <a href="https://wealthwise-af0e4.web.app/dashboard" class="cta-button">View Dashboard →</a>
                    </div>
                    <div class="footer">
                        <p>You're receiving this because you enabled email alerts in WealthWise.</p>
                        <p>© ${new Date().getFullYear()} WealthWise - Your AI Financial Advisor</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    },
    danger: {
        subject: "🚨 WealthWise Urgent: {title}",
        getHtml: (alert, userName) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .alert-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .alert-title { font-size: 18px; font-weight: bold; color: #991b1b; margin-bottom: 10px; }
                    .alert-message { color: #b91c1c; line-height: 1.6; }
                    .cta-button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚨 Urgent Alert</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName || "there"},</p>
                        <div class="alert-box">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                        <p>This requires your immediate attention. Please review and take action.</p>
                        <a href="https://wealthwise-af0e4.web.app/alerts" class="cta-button">Take Action →</a>
                    </div>
                    <div class="footer">
                        <p>You're receiving this because you enabled email alerts in WealthWise.</p>
                        <p>© ${new Date().getFullYear()} WealthWise - Your AI Financial Advisor</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    },
    info: {
        subject: "💡 WealthWise: {title}",
        getHtml: (alert, userName) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #8b5a2b, #a0522d); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .alert-box { background: #fef3c7; border-left: 4px solid #8b5a2b; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .alert-title { font-size: 18px; font-weight: bold; color: #78350f; margin-bottom: 10px; }
                    .alert-message { color: #92400e; line-height: 1.6; }
                    .cta-button { display: inline-block; background: #8b5a2b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💡 Financial Insight</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName || "there"},</p>
                        <div class="alert-box">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                        <p>Stay on top of your finances with WealthWise!</p>
                        <a href="https://wealthwise-af0e4.web.app/dashboard" class="cta-button">Open App →</a>
                    </div>
                    <div class="footer">
                        <p>You're receiving this because you enabled email alerts in WealthWise.</p>
                        <p>© ${new Date().getFullYear()} WealthWise - Your AI Financial Advisor</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    },
};

// ============== CLOUD FUNCTIONS ==============

// 1. Gemini Financial Advice (existing)
exports.getFinancialAdvice = onRequest((request, response) => {
    cors(request, response, async () => {
        try {
            const message = request.body.data?.message || request.body.message || "Give me general financial advice.";

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(message);
            const responseText = result.response.text();

            response.json({ data: responseText });
        } catch (error) {
            logger.error("Error calling Gemini:", error);
            response.status(500).send({ error: error.message });
        }
    });
});

// 2. Send Email Alert (HTTP endpoint)
exports.sendEmailAlert = onRequest((request, response) => {
    cors(request, response, async () => {
        try {
            const { userId, alert, email } = request.body;

            if (!email || !alert) {
                return response.status(400).json({ error: "Missing email or alert data" });
            }

            // Get user name from Firestore if userId provided
            let userName = "";
            if (userId) {
                try {
                    const userDoc = await db.collection("users").doc(userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().displayName || userDoc.data().name || "";
                    }
                } catch (e) {
                    logger.warn("Could not fetch user name:", e);
                }
            }

            // Get the appropriate template
            const template = emailTemplates[alert.type] || emailTemplates.info;
            const subject = template.subject.replace("{title}", alert.title);
            const html = template.getHtml(alert, userName);

            // Create transporter and send email
            const transporter = createEmailTransporter();
            
            await transporter.sendMail({
                from: `"WealthWise" <${process.env.GMAIL_USER || "wealthwise@gmail.com"}>`,
                to: email,
                subject: subject,
                html: html,
            });

            logger.info(`Email sent to ${email} for alert: ${alert.title}`);
            response.json({ success: true, message: "Email sent successfully" });

        } catch (error) {
            logger.error("Error sending email:", error);
            response.status(500).json({ error: error.message });
        }
    });
});

// 3. Firestore Trigger - Auto-send email when alert is created
exports.onAlertCreated = onDocumentCreated(
    "users/{userId}/alerts/{alertId}",
    async (event) => {
        try {
            const alertData = event.data.data();
            const userId = event.params.userId;
            const alertId = event.params.alertId;

            logger.info(`New alert created: ${alertId} for user: ${userId}`);

            // Get user data to check email preferences
            const userDoc = await db.collection("users").doc(userId).get();
            
            if (!userDoc.exists) {
                logger.warn(`User ${userId} not found`);
                return;
            }

            const userData = userDoc.data();
            const email = userData.email;
            const emailPrefs = userData.emailPreferences || {};

            // Check if user wants email notifications
            if (!emailPrefs.enabled) {
                logger.info(`Email notifications disabled for user ${userId}`);
                return;
            }

            // Check alert type preferences
            const alertType = alertData.type || "info";
            if (emailPrefs.types && !emailPrefs.types.includes(alertType)) {
                logger.info(`User ${userId} has disabled ${alertType} email alerts`);
                return;
            }

            // Send the email
            const template = emailTemplates[alertType] || emailTemplates.info;
            const subject = template.subject.replace("{title}", alertData.title);
            const html = template.getHtml(alertData, userData.displayName || userData.name);

            const transporter = createEmailTransporter();
            
            await transporter.sendMail({
                from: `"WealthWise" <${process.env.GMAIL_USER || "wealthwise@gmail.com"}>`,
                to: email,
                subject: subject,
                html: html,
            });

            logger.info(`Auto email sent to ${email} for alert: ${alertData.title}`);

            // Mark alert as emailed
            await db.collection("users").doc(userId).collection("alerts").doc(alertId).update({
                emailSent: true,
                emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        } catch (error) {
            logger.error("Error in onAlertCreated:", error);
        }
    }
);

// 4. Test Email Endpoint
exports.testEmail = onRequest((request, response) => {
    cors(request, response, async () => {
        try {
            const { email } = request.body;

            if (!email) {
                return response.status(400).json({ error: "Email is required" });
            }

            const transporter = createEmailTransporter();
            
            await transporter.sendMail({
                from: `"WealthWise" <${process.env.GMAIL_USER || "wealthwise@gmail.com"}>`,
                to: email,
                subject: "✅ WealthWise Email Test",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>🎉 Email Setup Successful!</h2>
                        <p>Your WealthWise email notifications are working correctly.</p>
                        <p>You'll receive alerts about:</p>
                        <ul>
                            <li>⚠️ Spending warnings</li>
                            <li>🎯 Goal achievements</li>
                            <li>📈 Investment updates</li>
                            <li>💡 Financial insights</li>
                        </ul>
                        <p>Happy saving! 💰</p>
                    </div>
                `,
            });

            response.json({ success: true, message: `Test email sent to ${email}` });

        } catch (error) {
            logger.error("Test email error:", error);
            response.status(500).json({ error: error.message });
        }
    });
});
