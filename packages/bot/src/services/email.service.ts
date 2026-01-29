/**
 * AWS SES 이메일 서비스
 *
 * Slack 워크스페이스 초대 이메일 발송을 담당합니다.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { WebClient } from '@slack/web-api';
import { getSecrets } from './secrets.service.js';

// AWS SES 클라이언트
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

// 발신자 이메일 (SES에서 인증된 이메일)
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'weareigrus@gmail.com';

// 브랜드 에셋
const BRAND = {
  logo: 'https://d3qp8nmugde8u1.cloudfront.net/images/igrus-logo.png',
  primaryColor: '#059669',
  primaryLight: '#34D399',
  primaryDark: '#047857',
  backgroundColor: '#ECFDF5',
  instagram: 'https://www.instagram.com/igrus_inha/',
  email: 'weareigrus@gmail.com',
};

// 이메일 발송 실패 알림 채널
const EMAIL_ALERT_CHANNEL = 'C0AABTKEQLT'; // #01-뱁둥이테스트

// Slack 클라이언트 캐시
let slackClient: WebClient | null = null;

/**
 * Slack 클라이언트를 가져옵니다.
 */
async function getSlackClient(): Promise<WebClient> {
  if (!slackClient) {
    const secrets = await getSecrets();
    slackClient = new WebClient(secrets.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

/**
 * 이메일 발송 실패 시 Slack 알림을 보냅니다.
 */
async function notifyEmailFailure(
  toEmail: string,
  name: string,
  errorMessage: string
): Promise<void> {
  try {
    const client = await getSlackClient();
    await client.chat.postMessage({
      channel: EMAIL_ALERT_CHANNEL,
      text: `❌ 이메일 발송 실패: ${toEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ 이메일 발송 실패',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*수신자*\n${name}`,
            },
            {
              type: 'mrkdwn',
              text: `*이메일*\n${toEmail}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*에러 메시지*\n\`\`\`${errorMessage}\`\`\``,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `발생 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
            },
          ],
        },
      ],
    });
  } catch (slackError) {
    console.error('Slack 알림 발송 실패:', slackError);
  }
}

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
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>IGRUS Slack 초대</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;">
  <!-- 전체 래퍼 -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- 메인 컨테이너 -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- 헤더 -->
          <tr>
            <td style="background-color: ${BRAND.primaryColor}; padding: 40px 30px; text-align: center;">
              <img src="${BRAND.logo}" alt="IGRUS" width="80" height="80" style="display: block; margin: 0 auto 20px; border-radius: 12px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">IGRUS 가입을 환영합니다!</h1>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong style="color: ${BRAND.primaryDark};">${name}</strong>님, 안녕하세요!
              </p>
              <p style="margin: 0 0 30px; color: #555555; font-size: 15px; line-height: 1.7;">
                회비 납부가 확인되어 IGRUS Slack 워크스페이스에 초대드립니다.<br>
                아래 버튼을 클릭하여 워크스페이스에 참여해주세요.
              </p>

              <!-- CTA 버튼 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${inviteLink}" target="_blank" style="display: inline-block; background-color: ${BRAND.primaryColor}; color: #ffffff; padding: 16px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Slack 워크스페이스 참여하기
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 안내사항 박스 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.backgroundColor}; border-radius: 8px; border-left: 4px solid ${BRAND.primaryColor};">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: ${BRAND.primaryDark}; font-size: 14px; font-weight: 600;">
                      참여 후 안내사항
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #555555; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 6px;">프로필 → 이름을 <strong>"이름 / 학과 / 학번(2자리)"</strong> 형식으로 변경해주세요</li>
                      <li style="margin-bottom: 6px;">예: 김아그 / 컴퓨터공학과 / 26</li>
                      <li><strong>#1-잡담</strong> 채널에서 자기소개를 해주세요!</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 문의 안내 -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #e0e0e0;">
                <tr>
                  <td style="padding-top: 20px;">
                    <p style="margin: 0; color: #777777; font-size: 13px; line-height: 1.6; text-align: center;">
                      메일이 잘못 발송되었거나 문의사항이 있으시면<br>
                      <a href="mailto:${BRAND.email}" style="color: ${BRAND.primaryColor}; text-decoration: none; font-weight: 500;">${BRAND.email}</a>으로 연락 부탁드립니다.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 30px; border-top: 1px solid #e8e8e8;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px; color: #333333; font-size: 14px; font-weight: 600;">
                      IGRUS - 인하대학교 IT 동아리
                    </p>
                    <!-- 인스타그램 링크 -->
                    <a href="${BRAND.instagram}" target="_blank" style="display: inline-block; color: ${BRAND.primaryColor}; font-size: 13px; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="16" height="16" style="vertical-align: middle; margin-right: 6px;">
                      @igrus_inha
                    </a>
                    <p style="margin: 16px 0 0; color: #999999; font-size: 11px;">
                      이 메일은 자동 발송되었습니다.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textBody = `
${name}님, 안녕하세요!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IGRUS 가입을 환영합니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

회비 납부가 확인되어 IGRUS Slack 워크스페이스에 초대드립니다.

아래 링크를 클릭하여 워크스페이스에 참여해주세요:
${inviteLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
참여 후 안내사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 프로필 → 이름을 "이름 / 학과 / 학번(2자리)" 형식으로 변경해주세요
  예: 김아그 / 컴퓨터공학과 / 26

• #1-잡담 채널에서 자기소개를 해주세요!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

메일이 잘못 발송되었거나 문의사항이 있으시면
${BRAND.email}으로 연락 부탁드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IGRUS - 인하대학교 IT 동아리
Instagram: @igrus_inha (${BRAND.instagram})

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 이메일 발송 실패:', error);

    // Slack 알림 발송
    await notifyEmailFailure(toEmail, name, errorMessage);

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
