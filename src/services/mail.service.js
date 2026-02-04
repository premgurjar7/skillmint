const { sendEmail, sendBulkEmail } = require('../config/mail');
const logger = require('../utils/logger');

class MailService {
    // Send welcome email
    static async sendWelcomeEmail(user) {
        try {
            const result = await sendEmail(user.email, 'welcome', {
                name: user.name,
                verificationLink: `${process.env.FRONTEND_URL}/verify-email`
            });

            logger.info(`Welcome email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send welcome email error: ${error.message}`);
            throw error;
        }
    }

    // Send verification email
    static async sendVerificationEmail(user, verificationToken) {
        try {
            const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            
            const result = await sendEmail(user.email, 'verifyEmail', {
                name: user.name,
                verificationLink: verificationLink
            });

            logger.info(`Verification email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send verification email error: ${error.message}`);
            throw error;
        }
    }

    // Send password reset email
    static async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            
            const result = await sendEmail(user.email, 'passwordReset', {
                name: user.name,
                resetLink: resetLink
            });

            logger.info(`Password reset email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send password reset email error: ${error.message}`);
            throw error;
        }
    }

    // Send course enrollment email
    static async sendCourseEnrollmentEmail(user, course) {
        try {
            const result = await sendEmail(user.email, 'courseEnrollment', {
                name: user.name,
                courseTitle: course.title,
                courseLink: `${process.env.FRONTEND_URL}/course/${course._id}`
            });

            logger.info(`Course enrollment email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send course enrollment email error: ${error.message}`);
            throw error;
        }
    }

    // Send commission earned email
    static async sendCommissionEarnedEmail(user, commission) {
        try {
            const result = await sendEmail(user.email, 'commissionEarned', {
                name: user.name,
                amount: commission.amount,
                courseTitle: commission.courseTitle || 'Course',
                commissionLink: `${process.env.FRONTEND_URL}/affiliate/commissions`
            });

            logger.info(`Commission earned email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send commission earned email error: ${error.message}`);
            throw error;
        }
    }

    // Send withdrawal request email
    static async sendWithdrawalRequestEmail(user, withdrawal) {
        try {
            const result = await sendEmail(user.email, 'withdrawalRequest', {
                name: user.name,
                amount: withdrawal.amount,
                status: withdrawal.status,
                withdrawalLink: `${process.env.FRONTEND_URL}/wallet/withdrawals`
            });

            logger.info(`Withdrawal request email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send withdrawal request email error: ${error.message}`);
            throw error;
        }
    }

    // Send admin notification email
    static async sendAdminNotification(subject, message, data = {}) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillmint.com';
            
            const result = await sendEmail(adminEmail, 'adminNotification', {
                subject: subject,
                message: message,
                data: data,
                timestamp: new Date().toISOString()
            });

            logger.info(`Admin notification sent: ${subject}`);

            return result;
        } catch (error) {
            logger.error(`Send admin notification error: ${error.message}`);
            throw error;
        }
    }

    // Send bulk emails to users
    static async sendBulkNewsletter(users, subject, content) {
        try {
            const recipients = users.map(user => user.email);
            const emailData = users.map(user => ({
                name: user.name,
                content: content
            }));

            const result = await sendBulkEmail(recipients, 'newsletter', emailData);

            logger.info(`Bulk newsletter sent to ${recipients.length} users`);

            return result;
        } catch (error) {
            logger.error(`Send bulk newsletter error: ${error.message}`);
            throw error;
        }
    }

    // Send course completion email
    static async sendCourseCompletionEmail(user, course, certificateUrl = null) {
        try {
            const result = await sendEmail(user.email, 'courseCompletion', {
                name: user.name,
                courseTitle: course.title,
                completionDate: new Date().toLocaleDateString(),
                certificateUrl: certificateUrl,
                shareMessage: `I just completed ${course.title} on SkillMint!`
            });

            logger.info(`Course completion email sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send course completion email error: ${error.message}`);
            throw error;
        }
    }

    // Send payment receipt email
    static async sendPaymentReceipt(user, order) {
        try {
            const result = await sendEmail(user.email, 'paymentReceipt', {
                name: user.name,
                orderId: order.orderId,
                amount: order.finalAmount,
                paymentMethod: order.paymentMethod,
                paymentDate: order.createdAt.toLocaleDateString(),
                courseTitle: order.course?.title || 'Course',
                receiptLink: `${process.env.FRONTEND_URL}/orders/${order._id}/receipt`
            });

            logger.info(`Payment receipt sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send payment receipt error: ${error.message}`);
            throw error;
        }
    }

    // Send account update email
    static async sendAccountUpdateEmail(user, updateType, details = {}) {
        try {
            const result = await sendEmail(user.email, 'accountUpdate', {
                name: user.name,
                updateType: updateType,
                details: details,
                timestamp: new Date().toLocaleString(),
                contactSupport: `${process.env.FRONTEND_URL}/contact`
            });

            logger.info(`Account update email sent to: ${user.email} (${updateType})`);

            return result;
        } catch (error) {
            logger.error(`Send account update email error: ${error.message}`);
            throw error;
        }
    }

    // Send affiliate invitation email
    static async sendAffiliateInvitation(email, inviterName, invitationLink) {
        try {
            const result = await sendEmail(email, 'affiliateInvitation', {
                inviterName: inviterName,
                invitationLink: invitationLink,
                platformName: 'SkillMint',
                benefits: [
                    'Earn commissions on course referrals',
                    'Access to marketing materials',
                    'Real-time analytics dashboard',
                    'Regular payout options'
                ]
            });

            logger.info(`Affiliate invitation sent to: ${email}`);

            return result;
        } catch (error) {
            logger.error(`Send affiliate invitation error: ${error.message}`);
            throw error;
        }
    }

    // Send system alert email
    static async sendSystemAlert(alertType, message, severity = 'medium') {
        try {
            const recipients = process.env.SYSTEM_ALERT_EMAILS 
                ? process.env.SYSTEM_ALERT_EMAILS.split(',') 
                : [process.env.ADMIN_EMAIL || 'admin@skillmint.com'];

            const result = await sendBulkEmail(recipients, 'systemAlert', {
                alertType: alertType,
                message: message,
                severity: severity,
                timestamp: new Date().toISOString(),
                server: process.env.SERVER_NAME || 'Production'
            });

            logger.info(`System alert sent: ${alertType} (${severity})`);

            return result;
        } catch (error) {
            logger.error(`Send system alert error: ${error.message}`);
            throw error;
        }
    }

    // Send monthly report email
    static async sendMonthlyReport(user, reportData) {
        try {
            const result = await sendEmail(user.email, 'monthlyReport', {
                name: user.name,
                month: reportData.month,
                year: reportData.year,
                stats: reportData.stats,
                topCourses: reportData.topCourses || [],
                earnings: reportData.earnings || 0,
                referrals: reportData.referrals || 0,
                reportLink: `${process.env.FRONTEND_URL}/reports/monthly`
            });

            logger.info(`Monthly report sent to: ${user.email}`);

            return result;
        } catch (error) {
            logger.error(`Send monthly report error: ${error.message}`);
            throw error;
        }
    }

    // Send OTP email
    static async sendOTPEmail(email, otp, purpose = 'verification') {
        try {
            const result = await sendEmail(email, 'otp', {
                otp: otp,
                purpose: purpose,
                validity: '10 minutes',
                warning: 'Do not share this OTP with anyone'
            });

            logger.info(`OTP email sent to: ${email} for ${purpose}`);

            return result;
        } catch (error) {
            logger.error(`Send OTP email error: ${error.message}`);
            throw error;
        }
    }

    // Test email service
    static async testEmailService(email) {
        try {
            const result = await sendEmail(email, 'test', {
                name: 'Test User',
                timestamp: new Date().toISOString(),
                service: 'SkillMint Mail Service'
            });

            logger.info(`Test email sent to: ${email}`);

            return {
                success: true,
                message: 'Test email sent successfully',
                details: result
            };
        } catch (error) {
            logger.error(`Test email service error: ${error.message}`);
            
            return {
                success: false,
                message: 'Failed to send test email',
                error: error.message
            };
        }
    }

    // Get email statistics
    static async getEmailStats(startDate, endDate) {
        try {
            // In a real application, you would query email logs from database
            // For now, return mock statistics
            
            const stats = {
                totalSent: 0,
                totalFailed: 0,
                successRate: 0,
                byType: {},
                dailyCount: {},
                topRecipients: []
            };

            logger.info(`Email statistics requested for ${startDate} to ${endDate}`);

            return stats;
        } catch (error) {
            logger.error(`Get email stats error: ${error.message}`);
            throw error;
        }
    }

    // Schedule email
    static async scheduleEmail(scheduleData) {
        try {
            const { recipients, template, data, scheduleTime } = scheduleData;
            
            // In a real application, you would:
            // 1. Save scheduled email to database
            // 2. Use a job scheduler (like Agenda, Bull, etc.)
            // 3. Send email at scheduled time
            
            logger.info(`Email scheduled for ${scheduleTime} to ${recipients.length} recipients`);

            return {
                success: true,
                message: 'Email scheduled successfully',
                scheduleId: `SCH${Date.now()}`,
                scheduledTime: scheduleTime
            };
        } catch (error) {
            logger.error(`Schedule email error: ${error.message}`);
            throw error;
        }
    }

    // Create custom email template
    static async createEmailTemplate(templateData) {
        try {
            const { name, subject, html, variables } = templateData;
            
            // In a real application, you would save template to database
            
            logger.info(`Email template created: ${name}`);

            return {
                success: true,
                message: 'Email template created successfully',
                template: {
                    name: name,
                    subject: subject,
                    variables: variables || []
                }
            };
        } catch (error) {
            logger.error(`Create email template error: ${error.message}`);
            throw error;
        }
    }

    // Update email template
    static async updateEmailTemplate(templateName, updates) {
        try {
            // In a real application, you would update template in database
            
            logger.info(`Email template updated: ${templateName}`);

            return {
                success: true,
                message: 'Email template updated successfully'
            };
        } catch (error) {
            logger.error(`Update email template error: ${error.message}`);
            throw error;
        }
    }

    // Unsubscribe email
    static async unsubscribeEmail(email, reason = '') {
        try {
            // In a real application, you would:
            // 1. Add email to unsubscribe list
            // 2. Update user preferences
            
            logger.info(`Email unsubscribed: ${email} - ${reason}`);

            return {
                success: true,
                message: 'Unsubscribed successfully'
            };
        } catch (error) {
            logger.error(`Unsubscribe email error: ${error.message}`);
            throw error;
        }
    }

    // Resubscribe email
    static async resubscribeEmail(email) {
        try {
            // In a real application, you would remove email from unsubscribe list
            
            logger.info(`Email resubscribed: ${email}`);

            return {
                success: true,
                message: 'Resubscribed successfully'
            };
        } catch (error) {
            logger.error(`Resubscribe email error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = MailService;