# Tasker 입금 알림 설정 가이드

안드로이드 Tasker 앱을 사용하여 은행 입금 알림을 자동으로 처리하는 방법입니다.

## 개요

1. 휴대폰에 입금 알림 수신
2. Tasker가 알림 감지
3. HTTP 요청으로 API 호출
4. 시스템이 자동 매칭 시도

## 필요 앱

- [Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm) (유료)
- [AutoNotification](https://play.google.com/store/apps/details?id=com.joaomgcd.autonotification) (Tasker 플러그인)

## 설정 단계

### 1. AutoNotification 설정

1. AutoNotification 앱 실행
2. **알림 접근 권한** 허용
3. 테스트 알림으로 정상 동작 확인

### 2. Tasker 프로필 생성

#### 프로필 (Profile)
1. **+ 버튼** → **Event** → **Plugin** → **AutoNotification** → **Intercept**
2. 설정:
   - **App**: 토스뱅크 (또는 사용하는 은행 앱)
   - **Title Filter**: `입금` (입금 알림만 필터)

#### 태스크 (Task)
1. 프로필에 연결할 태스크 생성
2. **+ 버튼** → **Net** → **HTTP Request**

### 3. HTTP Request 설정

```
Method: POST
URL: https://your-domain.com/api/payments/webhook
Headers:
  Content-Type: application/json
Body:
{
  "secret": "your-webhook-secret",
  "notification": {
    "text": "%antext",
    "timestamp": "%TIMES"
  }
}
```

#### 변수 설명
| 변수 | 설명 |
|------|------|
| `%antext` | 알림 텍스트 전체 |
| `%antitle` | 알림 제목 |
| `%TIMES` | 현재 시간 (초 단위) |

### 4. 알림 텍스트 형식

토스뱅크 입금 알림 형식:
```
홍길동님이 30,000원을 입금했습니다
```

시스템이 파싱하는 패턴:
```
{입금자명}님이 {금액}원을 입금했습니다
```

## API 명세

### POST /api/payments/webhook

요청:
```json
{
  "secret": "your-webhook-secret",
  "notification": {
    "text": "홍길동님이 30,000원을 입금했습니다",
    "timestamp": "2024-01-23T10:30:00+09:00"
  }
}
```

응답:
```json
{
  "success": true,
  "deposit": {
    "depositId": "dep_1706000000_abc123",
    "depositorName": "홍길동",
    "amount": 30000,
    "status": "pending"
  },
  "message": "Deposit notification received"
}
```

## 보안

### 시크릿 키 설정

환경 변수에 시크릿 설정:
```bash
PAYMENT_WEBHOOK_SECRET=your-secure-random-string
```

Tasker에서 동일한 시크릿 사용.

### HTTPS 필수

프로덕션 환경에서는 반드시 HTTPS 사용.

## 테스트

### 1. 수동 테스트

```bash
curl -X POST https://your-domain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "notification": {
      "text": "테스트님이 30,000원을 입금했습니다",
      "timestamp": "2024-01-23T10:30:00+09:00"
    }
  }'
```

### 2. Tasker 테스트

1. Tasker에서 태스크 수동 실행
2. 앱 로그에서 요청 확인
3. 대시보드 **회비 관리** → **입금 내역** 확인

## 지원 은행

알림 형식이 `{이름}님이 {금액}원을 입금했습니다` 패턴인 은행:
- 토스뱅크
- 카카오뱅크
- 케이뱅크

다른 은행은 알림 형식에 맞게 파싱 로직 수정 필요.

## 트러블슈팅

### 알림이 감지되지 않음

1. AutoNotification 알림 접근 권한 확인
2. 배터리 최적화에서 Tasker/AutoNotification 제외
3. 앱 필터 설정 확인

### HTTP 요청 실패

1. 네트워크 연결 확인
2. URL이 정확한지 확인
3. 시크릿 키 일치 확인
4. Tasker 로그 확인

### 파싱 실패

알림 텍스트가 예상 형식과 다른 경우:
1. 실제 알림 텍스트 확인
2. 필요시 API 파싱 로직 수정
