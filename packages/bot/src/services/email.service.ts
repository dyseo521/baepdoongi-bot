/**
 * AWS SES 이메일 서비스
 *
 * Slack 워크스페이스 초대 이메일 발송을 담당합니다.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// AWS SES 클라이언트
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

// 발신자 이메일 (SES에서 인증된 이메일)
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'weareigrus@gmail.com';

/** 초대 이메일 템플릿 옵션 */
export interface InviteEmailOptions {
  /** 수신자 이메일 */
  toEmail: string;
  /** 수신자 이름 */
  name: string;
  /** Slack 워크스페이스 초대 링크 */
  inviteLink: string;
}

/**
 * Slack 워크스페이스 초대 이메일을 발송합니다.
 */
export async function sendInviteEmail(options: InviteEmailOptions): Promise<boolean> {
  const { toEmail, name, inviteLink } = options;

  const subject = '[IGRUS] Slack 워크스페이스 초대';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4A154B 0%, #611F69 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #4A154B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #611F69; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 IGRUS 가입을 환영합니다!</h1>
    </div>
    <div class="content">
      <p><strong>${name}</strong>님, 안녕하세요!</p>
      <p>회비 납부가 확인되어 IGRUS Slack 워크스페이스에 초대드립니다.</p>
      <p>아래 버튼을 클릭하여 워크스페이스에 참여해주세요:</p>
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Slack 워크스페이스 참여하기</a>
      </p>
      <p><strong>참여 후 안내사항:</strong></p>
      <ul>
        <li>프로필 → 이름을 <strong>"이름/학과/학번(2자리)"</strong> 형식으로 변경해주세요</li>
        <li>예: 홍길동/컴퓨터공학과/24</li>
        <li>#general 채널에서 자기소개를 해주세요!</li>
      </ul>
      <p>궁금한 점이 있으시면 언제든 문의해주세요.</p>
    </div>
    <div class="footer">
      <p>IGRUS - 인하대학교 IT 동아리</p>
      <p>이 메일은 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
${name}님, 안녕하세요!

IGRUS 가입을 환영합니다! 🎉

회비 납부가 확인되어 IGRUS Slack 워크스페이스에 초대드립니다.

아래 링크를 클릭하여 워크스페이스에 참여해주세요:
${inviteLink}

[참여 후 안내사항]
- 프로필 → 이름을 "이름/학과/학번(2자리)" 형식으로 변경해주세요
  예: 홍길동/컴퓨터공학과/24
- #general 채널에서 자기소개를 해주세요!

궁금한 점이 있으시면 언제든 문의해주세요.

---
IGRUS - 인하대학교 IT 동아리
이 메일은 자동 발송되었습니다.
  `.trim();

  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`✅ 초대 이메일 발송 성공: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    return false;
  }
}

/**
 * 일반 이메일을 발송합니다.
 */
export async function sendEmail(options: {
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<boolean> {
  const { toEmail, subject, htmlBody, textBody } = options;

  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}
