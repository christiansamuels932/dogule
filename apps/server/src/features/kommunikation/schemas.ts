import { MessageCreateInput } from '../../../../../packages/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const parseMessageCreateInput = (payload: unknown): MessageCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid message payload');
  }

  const { senderId, recipientId, subject, body } = payload as Record<string, unknown>;

  if (!isString(senderId) || !isString(recipientId) || !isString(subject) || !isString(body)) {
    throw new Error('Message senderId, recipientId, subject and body are required');
  }

  return {
    senderId,
    recipientId,
    subject,
    body,
  };
};

export const parseMessageUpdateInput = (payload: unknown): Partial<MessageCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid message payload');
  }

  const { senderId, recipientId, subject, body } = payload as Record<string, unknown>;
  const result: Partial<MessageCreateInput> = {};

  if (senderId !== undefined) {
    if (!isString(senderId)) {
      throw new Error('Message senderId must be a string');
    }
    result.senderId = senderId;
  }

  if (recipientId !== undefined) {
    if (!isString(recipientId)) {
      throw new Error('Message recipientId must be a string');
    }
    result.recipientId = recipientId;
  }

  if (subject !== undefined) {
    if (!isString(subject)) {
      throw new Error('Message subject must be a string');
    }
    result.subject = subject;
  }

  if (body !== undefined) {
    if (!isString(body)) {
      throw new Error('Message body must be a string');
    }
    result.body = body;
  }

  return result;
};
