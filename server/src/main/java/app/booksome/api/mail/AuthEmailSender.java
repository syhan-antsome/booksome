package app.booksome.api.mail;

public interface AuthEmailSender {
    void sendPasswordResetCode(String email, String code);
    void sendEmailVerificationCode(String email, String code);
}
