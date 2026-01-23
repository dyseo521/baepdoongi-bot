# Google Forms 연동 가이드

Google Forms 제출 시 자동으로 지원서를 대시보드에 등록하는 방법입니다.

## 개요

1. 지원자가 Google Forms 작성 완료
2. Apps Script가 제출 이벤트 감지
3. 웹훅으로 대시보드 API 호출
4. 지원서가 DB에 저장됨

## 설정 방법

### 1. Google Forms 생성

필수 필드:
- 이름
- 학번
- 학과
- 이메일

### 2. Apps Script 설정

1. Google Forms 편집 화면에서 **더보기(⋮)** → **스크립트 편집기** 클릭
2. 아래 코드 붙여넣기:

```javascript
function onFormSubmit(e) {
  const responses = e.response.getItemResponses();
  const data = {};

  // 필드 매핑 (Forms 질문 제목에 맞게 수정)
  const fieldMapping = {
    '이름': 'name',
    '학번': 'studentId',
    '학과': 'department',
    '이메일': 'email',
  };

  responses.forEach(item => {
    const title = item.getItem().getTitle();
    const fieldName = fieldMapping[title];
    if (fieldName) {
      data[fieldName] = item.getResponse();
    }
  });

  // 웹훅 URL (실제 배포 URL로 변경)
  const webhookUrl = 'https://your-domain.com/api/payments/submissions';

  try {
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        ...data,
        submittedAt: new Date().toISOString(),
      }),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);
    console.log('Response:', response.getContentText());
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### 3. 트리거 설정

1. 스크립트 편집기에서 **트리거(시계 아이콘)** 클릭
2. **트리거 추가** 버튼 클릭
3. 설정:
   - 실행할 함수: `onFormSubmit`
   - 이벤트 소스: `양식에서`
   - 이벤트 유형: `양식 제출 시`
4. **저장** 클릭

### 4. 권한 승인

첫 실행 시 Google 계정 권한 승인 필요:
- `외부 서비스에 연결` 권한

## 테스트

1. Google Forms 테스트 제출
2. 대시보드 **회비 관리** → **지원서 내역** 확인
3. Apps Script 실행 로그 확인 (문제 발생 시)

## 트러블슈팅

### 웹훅이 동작하지 않음

1. Apps Script 실행 로그 확인
2. 웹훅 URL이 올바른지 확인
3. CORS 설정 확인

### 필드가 매핑되지 않음

- `fieldMapping` 객체의 키 값이 Forms 질문 제목과 정확히 일치하는지 확인
- 공백, 특수문자 주의

## API 명세

### POST /api/payments/submissions

```json
{
  "name": "홍길동",
  "studentId": "12231234",
  "department": "컴퓨터공학과",
  "email": "hong@example.com",
  "submittedAt": "2024-01-23T10:00:00.000Z"
}
```

응답:
```json
{
  "success": true,
  "submissionId": "sub_1706000000_abc123"
}
```
