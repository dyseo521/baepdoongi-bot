import type { JSONContent } from '@tiptap/react';

/**
 * Tiptap JSONContent → Slack mrkdwn 변환
 */
export function toMrkdwn(json: JSONContent): string {
  if (!json.content) return '';

  return json.content
    .map((node) => {
      if (node.type === 'paragraph') {
        return paragraphToMrkdwn(node);
      }
      return '';
    })
    .join('\n');
}

function paragraphToMrkdwn(node: JSONContent): string {
  if (!node.content) return '';

  return node.content
    .map((child) => {
      if (child.type === 'text') {
        let text = child.text ?? '';
        const marks = child.marks ?? [];

        // 마크 순서: code → strike → italic → bold (안쪽에서 바깥쪽으로)
        for (const mark of marks) {
          switch (mark.type) {
            case 'code':
              text = `\`${text}\``;
              break;
            case 'strike':
              text = `~${text}~`;
              break;
            case 'italic':
              text = `_${text}_`;
              break;
            case 'bold':
              text = `*${text}*`;
              break;
          }
        }

        return text;
      }
      return '';
    })
    .join('');
}

/**
 * Slack mrkdwn → Tiptap JSONContent 변환
 */
export function fromMrkdwn(text: string): JSONContent {
  if (!text) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  const lines = text.split('\n');
  const content: JSONContent[] = lines.map((line) => ({
    type: 'paragraph',
    content: parseLine(line),
  }));

  return { type: 'doc', content };
}

interface TextNode {
  type: 'text';
  text: string;
  marks?: Array<{ type: string }>;
}

function parseLine(line: string): TextNode[] {
  if (!line) return [];

  const result: TextNode[] = [];
  let remaining = line;

  // 서식 패턴: bold(*), italic(_), strike(~), code(`)
  const patterns = [
    { marker: '`', markType: 'code' },
    { marker: '~', markType: 'strike' },
    { marker: '_', markType: 'italic' },
    { marker: '*', markType: 'bold' },
  ];

  while (remaining) {
    // 가장 먼저 나오는 서식 찾기
    let firstMatch: {
      index: number;
      end: number;
      content: string;
      markType: string;
    } | null = null;

    for (const { marker, markType } of patterns) {
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedMarker}([^${escapedMarker}\\n]+)${escapedMarker}`);
      const match = regex.exec(remaining);

      if (match && (firstMatch === null || match.index < firstMatch.index)) {
        firstMatch = {
          index: match.index,
          end: match.index + match[0].length,
          content: match[1] ?? '',
          markType,
        };
      }
    }

    if (firstMatch) {
      // 서식 앞의 일반 텍스트
      if (firstMatch.index > 0) {
        result.push({
          type: 'text',
          text: remaining.substring(0, firstMatch.index),
        });
      }

      // 서식이 적용된 텍스트
      result.push({
        type: 'text',
        text: firstMatch.content,
        marks: [{ type: firstMatch.markType }],
      });

      remaining = remaining.substring(firstMatch.end);
    } else {
      // 남은 텍스트 전체가 일반 텍스트
      result.push({
        type: 'text',
        text: remaining,
      });
      remaining = '';
    }
  }

  return result;
}
