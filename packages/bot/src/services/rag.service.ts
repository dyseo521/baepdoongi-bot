/**
 * Amazon Bedrock Knowledge Base 연동 서비스
 *
 * RAG(Retrieval-Augmented Generation)를 사용하여
 * 동아리 관련 질문에 정확한 답변을 제공합니다.
 */

import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateCommandInput,
  RetrieveAndGenerateSessionConfiguration,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { saveRagSession, getRagSession } from './db.service.js';
import { getSecrets } from './secrets.service.js';
import { generateId } from '../utils/id.js';

// Bedrock 클라이언트 설정
const client = new BedrockAgentRuntimeClient({
  region: process.env['AWS_REGION'] || 'ap-northeast-2',
});

// Knowledge Base ID (지연 로드)
let knowledgeBaseId: string | undefined;

// Claude 모델 - Global Cross-Region Inference Profile (서울 지원)
// https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
// System-defined inference profile은 ID만으로 사용 가능
const CLAUDE_HAIKU_4_5_GLOBAL = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

// 기본 모델: Claude Haiku 4.5 (Global CRIS, 빠르고 저렴)
const REGION = process.env['AWS_REGION'] || 'ap-northeast-2';
// RetrieveAndGenerate에서는 inference profile ID를 modelArn에 직접 전달 가능
const MODEL_ARN = CLAUDE_HAIKU_4_5_GLOBAL;

/** RAG 응답 타입 */
export interface RagResponse {
  answer: string;
  sessionId: string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
}

/**
 * Knowledge Base에 질문하고 답변을 생성합니다.
 *
 * @param query - 사용자 질문
 * @param userId - Slack 사용자 ID (세션 관리용)
 * @param existingSessionId - 기존 대화 세션 ID (연속 대화용)
 */
export async function askKnowledgeBase(
  query: string,
  userId: string,
  existingSessionId?: string
): Promise<RagResponse> {
  // Secrets Manager에서 KB ID 로드 (캐싱됨)
  if (!knowledgeBaseId) {
    const secrets = await getSecrets();
    knowledgeBaseId = secrets.BEDROCK_KNOWLEDGE_BASE_ID;
  }

  if (!knowledgeBaseId) {
    throw new Error('BEDROCK_KNOWLEDGE_BASE_ID가 설정되지 않았습니다.');
  }

  // 세션 설정 (연속 대화 지원)
  let sessionConfiguration: RetrieveAndGenerateSessionConfiguration | undefined;
  if (existingSessionId) {
    const existingSession = await getRagSession(existingSessionId);
    if (existingSession?.bedrockSessionId) {
      sessionConfiguration = {
        kmsKeyArn: undefined, // 기본 암호화 사용
      };
    }
  }

  const input: RetrieveAndGenerateCommandInput = {
    input: {
      text: query,
    },
    retrieveAndGenerateConfiguration: {
      type: 'KNOWLEDGE_BASE',
      knowledgeBaseConfiguration: {
        knowledgeBaseId: knowledgeBaseId,
        modelArn: MODEL_ARN,
        generationConfiguration: {
          promptTemplate: {
            textPromptTemplate: `당신은 IGRUS 동아리의 친절한 도우미 "뱁둥이"입니다.
사용자의 질문에 친근하고 명확하게 답변해주세요.
답변은 한국어로 작성하고, 가능하면 이모지를 적절히 사용해주세요.
확실하지 않은 정보는 "확실하지 않지만" 등의 표현을 사용하세요.

Slack 형식으로 응답하세요:
- 마크다운 헤더(#, ##, ###)를 사용하지 마세요
- 사용자 멘션(<@USER_ID>)과 채널 멘션(<#CHANNEL_ID>)은 그대로 유지하세요

검색된 정보:
$search_results$

사용자 질문: $query$

답변:`,
          },
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 5, // 검색할 문서 수
          },
        },
      },
    },
    sessionId: existingSessionId,
  };

  try {
    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);

    const sessionId = response.sessionId || generateId('session');

    // 세션 저장
    await saveRagSession({
      sessionId,
      bedrockSessionId: response.sessionId,
      userId,
      lastQuery: query,
      lastResponse: response.output?.text || '',
    });

    // 인용 정보 추출
    const citations = response.citations?.map((citation) => ({
      text: citation.generatedResponsePart?.textResponsePart?.text || '',
      source:
        citation.retrievedReferences?.[0]?.location?.s3Location?.uri || '알 수 없는 출처',
    }));

    return {
      answer: response.output?.text || '죄송해요, 답변을 생성하지 못했어요. 😢',
      sessionId,
      citations,
    };
  } catch (error) {
    console.error('RAG 질문 처리 실패:', error);
    throw error;
  }
}

/**
 * Knowledge Base 연결 상태를 확인합니다.
 */
export async function checkKnowledgeBaseConnection(): Promise<boolean> {
  try {
    // KB ID 로드 시도
    if (!knowledgeBaseId) {
      const secrets = await getSecrets();
      knowledgeBaseId = secrets.BEDROCK_KNOWLEDGE_BASE_ID;
    }

    if (!knowledgeBaseId) {
      return false;
    }

    // 간단한 테스트 쿼리 실행
    await askKnowledgeBase('테스트', 'system', undefined);
    return true;
  } catch {
    return false;
  }
}
