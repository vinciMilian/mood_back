const nodemailer = require('nodemailer');

// Configuração do transporter de email
const createTransporter = () => {
    return nodemailer.createTransporter({
        service: 'gmail', // ou outro serviço de email
        auth: {
            user: process.env.EMAIL_USER, // Seu email
            pass: process.env.EMAIL_PASS  // Sua senha de app (não a senha normal)
        }
    });
};

// Função para enviar notificação de like
async function sendLikeNotification(postOwnerEmail, postOwnerName, likerName, postDescription) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: postOwnerEmail,
            subject: `❤️ ${likerName} curtiu seu post!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e91e63;">Nova curtida no seu post!</h2>
                    <p>Olá <strong>${postOwnerName}</strong>,</p>
                    <p><strong>${likerName}</strong> curtiu seu post:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-style: italic;">"${postDescription.length > 100 ? postDescription.substring(0, 100) + '...' : postDescription}"</p>
                    </div>
                    <p>Acesse nossa plataforma para ver mais detalhes!</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">Esta é uma notificação automática. Não responda este email.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email de like enviado:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Erro ao enviar email de like:', error);
        return { error: error.message };
    }
}

// Função para enviar notificação de comentário
async function sendCommentNotification(postOwnerEmail, postOwnerName, commenterName, commentText, postDescription) {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: postOwnerEmail,
            subject: `💬 ${commenterName} comentou no seu post!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196f3;">Novo comentário no seu post!</h2>
                    <p>Olá <strong>${postOwnerName}</strong>,</p>
                    <p><strong>${commenterName}</strong> comentou no seu post:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-style: italic;">"${postDescription.length > 100 ? postDescription.substring(0, 100) + '...' : postDescription}"</p>
                    </div>
                    <p><strong>Comentário:</strong></p>
                    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;">"${commentText}"</p>
                    </div>
                    <p>Acesse nossa plataforma para responder!</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">Esta é uma notificação automática. Não responda este email.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email de comentário enviado:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Erro ao enviar email de comentário:', error);
        return { error: error.message };
    }
}

// Função para testar configuração de email
async function testEmailConfiguration() {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Configuração de email verificada com sucesso!');
        return { success: true };
    } catch (error) {
        console.error('Erro na configuração de email:', error);
        return { error: error.message };
    }
}

module.exports = {
    sendLikeNotification,
    sendCommentNotification,
    testEmailConfiguration
};
