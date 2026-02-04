const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email configuration
const mailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    },
    tls: {
        rejectUnauthorized: false
    }
};

// Create transporter
const transporter = nodemailer.createTransport(mailConfig);

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        logger.error(`SMTP connection failed: ${error.message}`);
        console.error(`❌ SMTP connection failed: ${error.message}`.red);
    } else {
        logger.info('SMTP server is ready to send emails');
        console.log('✅ SMTP server is ready to send emails'.green);
    }
});

// Email templates
const emailTemplates = {
    // User registration
    welcome: (name) => ({
        subject: 'Welcome to SkillMint! Start Your Learning Journey',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4F46E5; margin-bottom: 10px;">🎉 Welcome to SkillMint!</h1>
                    <p style="color: #666; font-size: 16px;">Your account has been successfully created.</p>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h2 style="color: #334155; margin-bottom: 15px;">Hello ${name},</h2>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                        We're excited to have you on board! SkillMint is your gateway to acquiring new skills and advancing your career.
                    </p>
                    <p style="color: #475569; line-height: 1.6;">
                        Get started by exploring our wide range of courses and begin your learning journey today.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/dashboard" 
                       style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Go to Dashboard
                    </a>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #64748B; font-size: 14px;">
                    <p>If you have any questions, feel free to contact our support team.</p>
                    <p>Best regards,<br>The SkillMint Team</p>
                </div>
            </div>
        `
    }),

    // Email verification
    verifyEmail: (name, verificationLink) => ({
        subject: 'Verify Your Email Address - SkillMint',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4F46E5; margin-bottom: 10px;">📧 Verify Your Email</h1>
                    <p style="color: #666; font-size: 16px;">Please verify your email address to complete your registration</p>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h2 style="color: #334155; margin-bottom: 15px;">Hi ${name},</h2>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                        Thank you for signing up with SkillMint! To activate your account and access all features, please verify your email address by clicking the button below.
                    </p>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                        This link will expire in 24 hours.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" 
                       style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <div style="color: #DC2626; background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px;">
                    <p style="margin: 0; font-weight: bold;">⚠️ Important:</p>
                    <p style="margin: 5px 0 0 0;">If you didn't create an account with SkillMint, please ignore this email.</p>
                </div>
                
                <div style="color: #64748B; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p>If the button doesn't work, copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #4F46E5; font-size: 12px;">${verificationLink}</p>
                </div>
            </div>
        `
    }),

    // Password reset
    passwordReset: (name, resetLink) => ({
        subject: 'Reset Your Password - SkillMint',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4F46E5; margin-bottom: 10px;">🔒 Reset Your Password</h1>
                    <p style="color: #666; font-size: 16px;">You requested to reset your password</p>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h2 style="color: #334155; margin-bottom: 15px;">Hello ${name},</h2>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                        We received a request to reset your password for your SkillMint account. Click the button below to create a new password.
                    </p>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                        This password reset link is valid for the next 1 hour.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="background-color: #DC2626; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <div style="color: #DC2626; background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px;">
                    <p style="margin: 0; font-weight: bold;">⚠️ Security Alert:</p>
                    <p style="margin: 5px 0 0 0;">If you didn't request a password reset, please ignore this email or contact support immediately.</p>
                </div>
                
                <div style="color: #64748B; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p>If the button doesn't work, copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #4F46E5; font-size: 12px;">${resetLink}</p>
                </div>
            </div>
        `
    }),

    // Course enrollment
    courseEnrollment: (name, courseTitle) => ({
        subject: `🎓 Course Enrolled: ${courseTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10B981; margin-bottom: 10px;">🎉 Congratulations!</h1>
                    <p style="color: #666; font-size: 16px;">You have successfully enrolled in a new course</p>
                </div>
                
                <div style="background-color: #F0FDF4; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10B981;">
                    <h2 style="color: #065F46; margin-bottom: 15px;">Hi ${name},</h2>
                    <p style="color: #047857; line-height: 1.6; margin-bottom: 15px;">
                        Great news! You have successfully enrolled in <strong>${courseTitle}</strong>.
                    </p>
                    <p style="color: #047857; line-height: 1.6;">
                        You can now access the course materials and start your learning journey immediately.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/my-courses" 
                       style="background-color: #10B981; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Start Learning Now
                    </a>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #334155; margin-bottom: 10px;">💡 Quick Tips:</h3>
                    <ul style="color: #475569; padding-left: 20px; margin: 0;">
                        <li>Set aside dedicated time for learning</li>
                        <li>Take notes and practice regularly</li>
                        <li>Join course discussions and ask questions</li>
                        <li>Complete assignments to reinforce learning</li>
                    </ul>
                </div>
                
                <div style="color: #64748B; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p>Happy Learning!<br>The SkillMint Team</p>
                </div>
            </div>
        `
    }),

    // Commission earned
    commissionEarned: (name, amount, courseTitle) => ({
        subject: `💰 Commission Earned: ₹${amount}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #F59E0B; margin-bottom: 10px;">💰 Commission Earned!</h1>
                    <p style="color: #666; font-size: 16px;">You have earned a new commission</p>
                </div>
                
                <div style="background-color: #FFFBEB; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #F59E0B;">
                    <h2 style="color: #92400E; margin-bottom: 15px;">Hi ${name},</h2>
                    <p style="color: #B45309; line-height: 1.6; margin-bottom: 15px;">
                        Congratulations! You have earned a commission of <strong>₹${amount}</strong> for referring a student to the course:
                    </p>
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #334155;">${courseTitle}</h3>
                        <p style="margin: 0; color: #64748B;">Commission has been credited to your wallet</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/affiliate/dashboard" 
                       style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        View Commission Details
                    </a>
                </div>
                
                <div style="background-color: #F8FAFC; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #334155; margin-bottom: 10px;">📈 Tips to Earn More:</h3>
                    <ul style="color: #475569; padding-left: 20px; margin: 0;">
                        <li>Share your referral link on social media</li>
                        <li>Create content about the courses</li>
                        <li>Join our affiliate community</li>
                        <li>Use our marketing materials</li>
                    </ul>
                </div>
                
                <div style="color: #64748B; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p>Keep up the great work!<br>The SkillMint Team</p>
                </div>
            </div>
        `
    }),

    // Withdrawal request
    withdrawalRequest: (name, amount, status) => ({
        subject: `🏦 Withdrawal Request ${status === 'approved' ? 'Approved' : 'Received'}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6366F1; margin-bottom: 10px;">${status === 'approved' ? '✅ Withdrawal Approved' : '⏳ Withdrawal Received'}</h1>
                    <p style="color: #666; font-size: 16px;">Your withdrawal request ${status === 'approved' ? 'has been approved' : 'is being processed'}</p>
                </div>
                
                <div style="background-color: #EEF2FF; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #6366F1;">
                    <h2 style="color: #3730A3; margin-bottom: 15px;">Hi ${name},</h2>
                    <p style="color: #4F46E5; line-height: 1.6; margin-bottom: 15px;">
                        ${status === 'approved' 
                            ? `Your withdrawal request for <strong>₹${amount}</strong> has been approved and will be processed shortly.` 
                            : `We have received your withdrawal request for <strong>₹${amount}</strong>. Our team is currently reviewing it.`}
                    </p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748B;">Amount:</span>
                            <span style="font-weight: bold; color: #334155;">₹${amount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #64748B;">Status:</span>
                            <span style="font-weight: bold; color: ${status === 'approved' ? '#10B981' : '#F59E0B'};">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748B;">Date:</span>
                            <span style="color: #334155;">${new Date().toLocaleDateString('en-IN')}</span>
                        </div>
                    </div>
                </div>
                
                ${status === 'approved' ? `
                <div style="background-color: #D1FAE5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #065F46; margin-bottom: 10px;">📋 Next Steps:</h3>
                    <ul style="color: #047857; padding-left: 20px; margin: 0;">
                        <li>The amount will be transferred to your registered account within 3-5 business days</li>
                        <li>You will receive a confirmation email once the transfer is complete</li>
                        <li>Check your transaction history for updates</li>
                    </ul>
                </div>
                ` : `
                <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #92400E; margin-bottom: 10px;">⏰ Processing Time:</h3>
                    <ul style="color: #B45309; padding-left: 20px; margin: 0;">
                        <li>Withdrawal requests are typically processed within 24-48 hours</li>
                        <li>You will be notified via email once approved</li>
                        <li>Contact support if you have any questions</li>
                    </ul>
                </div>
                `}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/wallet" 
                       style="background-color: #6366F1; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        View Wallet
                    </a>
                </div>
                
                <div style="color: #64748B; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p>Thank you for being a part of SkillMint!<br>The SkillMint Team</p>
                </div>
            </div>
        `
    })
};

// Send email function
const sendEmail = async (to, template, data) => {
    try {
        if (!to || !template || !data) {
            throw new Error('Missing required parameters for sending email');
        }

        const emailTemplate = emailTemplates[template];
        if (!emailTemplate) {
            throw new Error(`Email template "${template}" not found`);
        }

        const { subject, html } = emailTemplate(data);
        
        const mailOptions = {
            from: `"SkillMint" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html,
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        
        logger.info(`Email sent successfully: ${info.messageId} to ${to}`);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
        
    } catch (error) {
        logger.error(`Error sending email: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
};

// Send bulk emails
const sendBulkEmail = async (recipients, template, dataArray) => {
    try {
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            throw new Error('Invalid recipients list');
        }

        const results = [];
        const batchSize = 10; // Send 10 emails at a time to avoid rate limiting
        const batches = [];

        // Create batches
        for (let i = 0; i < recipients.length; i += batchSize) {
            batches.push(recipients.slice(i, i + batchSize));
        }

        // Process each batch
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const batchPromises = batch.map((recipient, index) => {
                const data = dataArray ? dataArray[i * batchSize + index] : {};
                return sendEmail(recipient, template, data);
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);

            // Delay between batches to avoid rate limiting
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        logger.info(`Bulk email sent: ${successful} successful, ${failed} failed`);

        return {
            total: results.length,
            successful,
            failed,
            results
        };

    } catch (error) {
        logger.error(`Error sending bulk email: ${error.message}`);
        throw error;
    }
};

// Test email connection
const testConnection = async () => {
    try {
        await transporter.verify();
        return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

module.exports = {
    transporter,
    emailTemplates,
    sendEmail,
    sendBulkEmail,
    testConnection
};