/**
 * RAG Lambda 핸들러
 * SQS에서 질문을 받아 Bedrock Knowledge Base로 처리
 */

import type { SQSEvent, SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('[RAG] Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      console.log('[RAG] Processing:', body);

      // TODO: Bedrock Knowledge Base 연동 구현
      // 현재는 placeholder
    } catch (error) {
      console.error('[RAG] Error processing record:', error);
    }
  }
};
