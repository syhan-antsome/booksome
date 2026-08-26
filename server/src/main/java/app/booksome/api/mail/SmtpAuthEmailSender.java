package app.booksome.api.mail;

import app.booksome.api.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpAuthEmailSender implements AuthEmailSender {

    private final JavaMailSender javaMailSender;
    private final BooksomeMailProperties properties;

    public SmtpAuthEmailSender(JavaMailSender javaMailSender, BooksomeMailProperties properties) {
        this.javaMailSender = javaMailSender;
        this.properties = properties;
    }

    @Override
    public void sendPasswordResetCode(String email, String code) {
        send(
            email,
            "[BookSome] 비밀번호 재설정 코드",
            "북썸 비밀번호 재설정 코드입니다.\n\n" + code
                + "\n\n이 코드는 15분 동안 유효합니다. 요청하지 않았다면 이 메일을 무시해주세요."
        );
    }

    @Override
    public void sendEmailVerificationCode(String email, String code) {
        send(
            email,
            "[BookSome] 이메일 인증 코드",
            "북썸 이메일 인증 코드입니다.\n\n" + code
                + "\n\n이 코드는 15분 동안 유효합니다."
        );
    }

    private void send(String recipient, String subject, String body) {
        if (!properties.enabled()) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "mail_not_configured",
                "이메일 발송 설정이 아직 완료되지 않았습니다."
            );
        }

        var message = new SimpleMailMessage();
        message.setFrom(properties.fromAddress());
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        try {
            javaMailSender.send(message);
        } catch (MailException error) {
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "mail_delivery_failed",
                "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해주세요."
            );
        }
    }
}
