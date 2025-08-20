import { SimilarNote } from '@/@types/embedding';

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
	consultedNotes?: SimilarNote[]; // Notes
}

export interface SimplifiedMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}
